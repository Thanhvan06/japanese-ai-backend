import { prisma } from "../prisma.js";

const parseJSONField = (jsonString, defaultValue = []) => {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Error parsing JSON:", e);
    return defaultValue;
  }
};

export const getReadingByLevel = async (req, res, next) => {
  try {
    const { level, exerciseType } = req.query;

    if (!level) {
      return res.status(400).json({
        message: "Thiếu tham số level (N5, N4, N3, N2, N1)",
      });
    }

    const whereClause = {
      jlpt_level: level,
      is_published: true,
      ...(exerciseType && {
        items: {
          some: { exercise_type: exerciseType },
        },
      }),
    };

    const sets = await prisma.reading_sets.findMany({
      where: whereClause,
      include: {
        items: {
          where: exerciseType ? { exercise_type: exerciseType } : undefined,
          orderBy: { item_id: "asc" },
        },
      },
      orderBy: { set_id: "asc" },
    });

    const exercises = sets.flatMap((set) =>
      set.items.map((item) => ({
        id: item.item_id,
        set_id: set.set_id,
        set_title: set.title,
        jlpt_level: set.jlpt_level,
        exercise_type: item.exercise_type,
        passage: item.passage,
        question: item.question,
        options: parseJSONField(item.options_json),
        blanks: parseJSONField(item.blanks_json),
      }))
    );

    return res.json({ exercises });
  } catch (err) {
    next(err);
  }
};

export const getReadingDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.reading_items.findUnique({
      where: { item_id: parseInt(id) },
      include: { set: true },
    });

    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }

    const options = parseJSONField(item.options_json);
    const blanks = parseJSONField(item.blanks_json);

    let correctAnswer = null;
    if (
      item.exercise_type === "reading_comprehension" &&
      options.length > 0 &&
      item.correct_index !== null &&
      item.correct_index >= 0 &&
      item.correct_index < options.length
    ) {
      correctAnswer = options[item.correct_index];
    }

    return res.json({
      id: item.item_id,
      set_id: item.set_id,
      set_title: item.set?.title,
      jlpt_level: item.set?.jlpt_level,
      exercise_type: item.exercise_type,
      passage: item.passage,
      question: item.question,
      options,
      blanks,
      correctAnswer,
      correctIndex: item.correct_index,
      explain_viet: item.explain_viet,
    });
  } catch (err) {
    next(err);
  }
};

export const recordAttempt = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const { itemId, isCorrect } = req.body;

    if (!itemId || typeof isCorrect !== "boolean") {
      return res.status(400).json({
        message: "Thiếu tham số itemId hoặc isCorrect",
      });
    }

    await prisma.reading_attempts.create({
      data: {
        user_id: userId,
        item_id: parseInt(itemId),
        is_correct: isCorrect,
      },
    });

    return res.json({ message: "Đã lưu kết quả" });
  } catch (err) {
    next(err);
  }
};

export const checkFillInTheBlank = async (req, res, next) => {
  try {
    const { itemId, answers } = req.body;

    if (!itemId || !Array.isArray(answers)) {
      return res.status(400).json({
        message: "Thiếu tham số itemId hoặc answers (array)",
      });
    }

    const item = await prisma.reading_items.findUnique({
      where: { item_id: parseInt(itemId) },
    });

    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }

    if (item.exercise_type !== "fill_in_the_blank") {
      return res.status(400).json({
        message: "Bài tập này không phải loại fill_in_the_blank",
      });
    }

    const blanks = parseJSONField(item.blanks_json);
    if (!blanks.length) {
      return res.status(500).json({ message: "Lỗi parse dữ liệu" });
    }

    const results = blanks.map((blank, index) => {
      const correctIndex = blank.correct_index || 0;
      const isCorrect = answers[index] === correctIndex;
      return {
        position: blank.position,
        userAnswer: answers[index],
        correctIndex,
        isCorrect,
        options: blank.options || [],
      };
    });

    const correctCount = results.filter((r) => r.isCorrect).length;
    const isAllCorrect = correctCount === blanks.length;

    if (req.user?.user_id) {
      try {
        await prisma.reading_attempts.create({
          data: {
            user_id: req.user.user_id,
            item_id: parseInt(itemId),
            is_correct: isAllCorrect,
          },
        });
      } catch (e) {
        console.error("Error recording attempt:", e);
      }
    }

    return res.json({
      isCorrect: isAllCorrect,
      score: `${correctCount}/${blanks.length}`,
      correctCount,
      totalBlanks: blanks.length,
      results,
    });
  } catch (err) {
    next(err);
  }
};

export const getProgress = async (req, res, next) => {
  try {
    const { level } = req.query;
    const userId = req.user?.user_id;

    if (!level) {
      return res.status(400).json({ message: "Thiếu tham số level" });
    }

    if (!userId) {
      return res.json({ byItem: {} });
    }

    const sets = await prisma.reading_sets.findMany({
      where: {
        jlpt_level: level,
        is_published: true,
      },
      include: {
        items: { select: { item_id: true } },
      },
    });

    const itemIds = sets.flatMap((set) => set.items.map((item) => item.item_id));

    if (itemIds.length === 0) {
      return res.json({ byItem: {} });
    }

    const attempts = await prisma.reading_attempts.findMany({
      where: {
        user_id: userId,
        item_id: { in: itemIds },
      },
      orderBy: { created_at: "desc" },
      distinct: ["item_id"],
    });

    const byItem = {};
    attempts.forEach((attempt) => {
      byItem[attempt.item_id] = attempt.is_correct;
    });

    return res.json({ byItem });
  } catch (err) {
    next(err);
  }
};

