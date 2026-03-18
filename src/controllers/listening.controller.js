import { prisma } from "../prisma.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { generateAudioFromText, generateAndUpdateAudio } from "../services/tts.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || "http://localhost:4000";

function resolveAudioUrl(audioUrl) {
  if (!audioUrl) return null;
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://"))
    return audioUrl;
  const base = BASE_URL.replace(/\/$/, "");
  const p = audioUrl.startsWith("/") ? audioUrl : `/${audioUrl}`;
  return base + p;
}

// GET /api/listening?level=N5&exerciseType=multiple_choice
export const getListeningByLevel = async (req, res, next) => {
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
    };

    if (exerciseType) {
      whereClause.items = {
        some: {
          exercise_type: exerciseType,
        },
      };
    }

    // Get listening sets for the level
    const sets = await prisma.listening_sets.findMany({
      where: whereClause,
      include: {
        items: {
          where: exerciseType ? { exercise_type: exerciseType } : undefined,
          orderBy: { item_id: "asc" },
        },
      },
      orderBy: { set_id: "asc" },
    });

    // Flatten items from all sets into exercises
    const exercises = [];
    sets.forEach((set) => {
      set.items.forEach((item) => {
        let options = [];
        let words = [];
        try {
          if (item.options_json) {
            options = JSON.parse(item.options_json);
          }
        } catch (e) {
          console.error("Error parsing options_json:", e);
          options = [];
        }
        try {
          if (item.words_json) {
            words = JSON.parse(item.words_json);
          }
        } catch (e) {
          console.error("Error parsing words_json:", e);
          words = [];
        }

        exercises.push({
          id: item.item_id,
          set_id: set.set_id,
          set_title: set.title,
          jlpt_level: set.jlpt_level,
          exercise_type: item.exercise_type,
          audioUrl: resolveAudioUrl(item.audio_url),
          question: item.question,
          options: options,
          words: words,
        });
      });
    });

    return res.json({ exercises });
  } catch (err) {
    next(err);
  }
};

// GET /api/listening/review?level=N5
// Trả về danh sách bài cần ôn tập hôm nay cho user (new + learning)
export const getListeningReview = async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Cần đăng nhập để lấy danh sách ôn tập" });
    }

    const { level } = req.query;
    if (!level) {
      return res
        .status(400)
        .json({ message: "Thiếu tham số level (N5, N4, N3, N2, N1)" });
    }

    const sets = await prisma.listening_sets.findMany({
      where: { jlpt_level: level, is_published: true },
      include: {
        items: {
          orderBy: { item_id: "asc" },
        },
      },
      orderBy: { set_id: "asc" },
    });

    const allItems = [];
    sets.forEach((set) => {
      set.items.forEach((item) => {
        let options = [];
        try {
          options = JSON.parse(item.options_json);
        } catch (e) {
          console.error("Error parsing options_json:", e);
          options = [];
        }

        allItems.push({
          id: item.item_id,
          set_id: set.set_id,
          set_title: set.title,
          jlpt_level: set.jlpt_level,
          audioUrl: resolveAudioUrl(item.audio_url),
          question: item.question,
          options,
        });
      });
    });

    if (allItems.length === 0) {
      return res.json({ newItems: [], learningItems: [] });
    }

    const itemIds = allItems.map((i) => i.id);

    const attempts = await prisma.listening_attempts.findMany({
      where: {
        user_id: req.user.user_id,
        item_id: { in: itemIds },
      },
      orderBy: { created_at: "asc" },
    });

    const progressByItem = {};
    for (const a of attempts) {
      if (!progressByItem[a.item_id]) {
        progressByItem[a.item_id] = {
          attempted: false,
          lastCorrect: false,
          wrongCount: 0,
        };
      }
      progressByItem[a.item_id].attempted = true;
      progressByItem[a.item_id].lastCorrect = a.is_correct;
      if (!a.is_correct) {
        progressByItem[a.item_id].wrongCount += 1;
      }
    }

    const newItems = [];
    const learningItems = [];

    allItems.forEach((item) => {
      const p = progressByItem[item.id];
      if (!p) {
        newItems.push(item);
      } else if (!p.lastCorrect) {
        learningItems.push({
          ...item,
          wrongCount: p.wrongCount,
        });
      }
    });

    learningItems.sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0));

    return res.json({
      newItems: newItems.slice(0, 3),
      learningItems: learningItems.slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/listening/:id
export const getListeningDetail = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "exerciseId không hợp lệ" });
    }

    const item = await prisma.listening_items.findUnique({
      where: { item_id: id },
      include: {
        set: {
          select: {
            set_id: true,
            jlpt_level: true,
            title: true,
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy bài tập luyện nghe" });
    }

    // Parse options from JSON
    let options = [];
    try {
      if (item.options_json) {
        const parsed = JSON.parse(item.options_json);
        options = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error("Error parsing options_json:", e);
      options = [];
    }

    // Get correct answer from options array using correct_index
    let correctAnswer = "";
    if (Array.isArray(options) && options.length > 0 && item.correct_index != null) {
      const index = Number(item.correct_index);
      if (!Number.isNaN(index) && index >= 0 && index < options.length) {
        correctAnswer = options[index] || "";
      }
    }

    // Parse words for sentence ordering
    let words = [];
    try {
      if (item.words_json) {
        const parsed = JSON.parse(item.words_json);
        words = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.error("Error parsing words_json:", e);
      words = [];
    }

    // Format response
    const formattedExercise = {
      id: item.item_id,
      set_id: item.set?.set_id || null,
      set_title: item.set?.title || "",
      jlpt_level: item.set?.jlpt_level || item.jlpt_level || "N5",
      exercise_type: item.exercise_type || "multiple_choice",
      audioUrl: resolveAudioUrl(item.audio_url),
      transcript: item.transcript_jp || "",
      translation: item.explain_viet || "",
      question: item.question || "",
      options: options,
      words: words,
      correctAnswer: correctAnswer,
    };

    return res.json(formattedExercise);
  } catch (err) {
    next(err);
  }
};

// POST /api/listening/upload
export const uploadAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file được upload" });
    }

    // Tạo URL để truy cập file
    const baseUrl = process.env.BASE_URL || "http://localhost:4000";
    const fileUrl = `${baseUrl}/uploads/audio/${req.file.filename}`;

    return res.json({
      message: "Upload audio thành công",
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: fileUrl,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/listening/audio/:filename
export const deleteAudio = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "../../uploads/audio", filename);

    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File không tồn tại" });
    }

    // Xóa file
    fs.unlinkSync(filePath);

    return res.json({ message: "Xóa file thành công" });
  } catch (err) {
    next(err);
  }
};

// POST /api/listening/generate-audio
// Generate audio từ transcript sử dụng TTS
export const generateAudio = async (req, res, next) => {
  try {
    const { text, itemId, options } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Thiếu tham số text (transcript)" });
    }

    let result;

    // Nếu có itemId, generate và cập nhật vào database
    if (itemId) {
      result = await generateAndUpdateAudio(itemId, text);
      return res.json({
        message: "Generate audio và cập nhật database thành công",
        audioUrl: result.audioUrl,
      });
    } else {
      // Chỉ generate audio, không cập nhật database
      result = await generateAudioFromText(text, null, options);
      return res.json({
        message: "Generate audio thành công",
        filename: result.filename,
        url: result.url,
        size: result.size,
      });
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/listening/generate-audio-batch
// Generate audio cho nhiều items cùng lúc
export const generateAudioBatch = async (req, res, next) => {
  try {
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ 
        message: "Thiếu tham số itemIds (array of item IDs)" 
      });
    }

    const results = [];
    const errors = [];

    for (const itemId of itemIds) {
      try {
        // Lấy transcript từ database
        const item = await prisma.listening_items.findUnique({
          where: { item_id: itemId },
          select: { transcript_jp: true },
        });

        if (!item) {
          errors.push({ itemId, error: "Item không tồn tại" });
          continue;
        }

        if (!item.transcript_jp) {
          errors.push({ itemId, error: "Item không có transcript" });
          continue;
        }

        // Generate audio
        const result = await generateAndUpdateAudio(itemId, item.transcript_jp);
        results.push({ itemId, audioUrl: result.audioUrl });
      } catch (error) {
        errors.push({ itemId, error: error.message });
      }
    }

    return res.json({
      message: `Generate audio hoàn tất: ${results.length} thành công, ${errors.length} lỗi`,
      results,
      errors,
    });
  } catch (err) {
    next(err);
  }
};

const MAX_RETRIES = 3;

// POST /api/listening/attempt - Ghi nhận lần làm bài (đúng/sai). Cần đăng nhập.
export const recordAttempt = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Cần đăng nhập để lưu tiến độ" });
    }
    const { itemId, isCorrect } = req.body;
    if (itemId == null || typeof isCorrect !== "boolean") {
      return res.status(400).json({ message: "Thiếu itemId hoặc isCorrect" });
    }
    const item = await prisma.listening_items.findUnique({
      where: { item_id: Number(itemId) },
    });
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }
    await prisma.listening_attempts.create({
      data: {
        user_id: req.user.user_id,
        item_id: item.item_id,
        is_correct: isCorrect,
      },
    });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/listening/check-dictation - Kiểm tra đáp án dictation
export const checkDictation = async (req, res, next) => {
  try {
    const { itemId, userAnswer } = req.body;
    
    if (itemId == null || !userAnswer) {
      return res.status(400).json({ 
        message: "Thiếu itemId hoặc userAnswer" 
      });
    }

    const item = await prisma.listening_items.findUnique({
      where: { item_id: Number(itemId) },
      select: {
        item_id: true,
        transcript_jp: true,
        exercise_type: true,
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }

    if (item.exercise_type !== "dictation") {
      return res.status(400).json({ 
        message: "Bài tập này không phải loại dictation" 
      });
    }

    const correctAnswer = (item.transcript_jp || "").trim();
    const userAnswerTrimmed = userAnswer.trim();

    // Normalize Japanese text for comparison (remove spaces, normalize characters)
    const normalize = (text) => {
      return text
        .replace(/\s+/g, "")
        .replace(/[。、]/g, "")
        .toLowerCase();
    };

    const normalizedCorrect = normalize(correctAnswer);
    const normalizedUser = normalize(userAnswerTrimmed);
    const isCorrect = normalizedCorrect === normalizedUser;

    // Calculate accuracy percentage
    let accuracy = 0;
    if (normalizedCorrect.length > 0) {
      let matches = 0;
      const minLen = Math.min(normalizedCorrect.length, normalizedUser.length);
      for (let i = 0; i < minLen; i++) {
        if (normalizedCorrect[i] === normalizedUser[i]) {
          matches++;
        }
      }
      accuracy = Math.round((matches / normalizedCorrect.length) * 100);
    }

    // Find differences for highlighting
    const differences = [];
    const maxLen = Math.max(normalizedCorrect.length, normalizedUser.length);
    for (let i = 0; i < maxLen; i++) {
      if (normalizedCorrect[i] !== normalizedUser[i]) {
        differences.push(i);
      }
    }

    // Save attempt if user is logged in
    if (req.user) {
      try {
        await prisma.listening_attempts.create({
          data: {
            user_id: req.user.user_id,
            item_id: item.item_id,
            is_correct: isCorrect,
          },
        });
      } catch (err) {
        console.error("Error saving attempt:", err);
      }
    }

    return res.json({
      isCorrect,
      accuracy,
      correctAnswer,
      differences,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/listening/check-sentence-ordering - Kiểm tra đáp án sentence ordering
export const checkSentenceOrdering = async (req, res, next) => {
  try {
    const { itemId, orderedWords } = req.body;
    
    if (itemId == null || !Array.isArray(orderedWords)) {
      return res.status(400).json({ 
        message: "Thiếu itemId hoặc orderedWords (array)" 
      });
    }

    const item = await prisma.listening_items.findUnique({
      where: { item_id: Number(itemId) },
      select: {
        item_id: true,
        transcript_jp: true,
        words_json: true,
        exercise_type: true,
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }

    if (item.exercise_type !== "sentence_ordering") {
      return res.status(400).json({ 
        message: "Bài tập này không phải loại sentence ordering" 
      });
    }

    let correctWords = [];
    try {
      if (item.words_json) {
        correctWords = JSON.parse(item.words_json);
      } else if (item.transcript_jp) {
        // Fallback: split transcript by spaces if words_json not available
        correctWords = item.transcript_jp.trim().split(/\s+/);
      }
    } catch (e) {
      console.error("Error parsing words_json:", e);
      if (item.transcript_jp) {
        correctWords = item.transcript_jp.trim().split(/\s+/);
      }
    }

    // Normalize for comparison
    const normalizeWord = (w) => w.trim().replace(/[。、]/g, "");
    const normalizedCorrect = correctWords.map(normalizeWord);
    const normalizedUser = orderedWords.map(normalizeWord);

    const isCorrect = 
      normalizedCorrect.length === normalizedUser.length &&
      normalizedCorrect.every((word, idx) => word === normalizedUser[idx]);

    // Save attempt if user is logged in
    if (req.user) {
      try {
        await prisma.listening_attempts.create({
          data: {
            user_id: req.user.user_id,
            item_id: item.item_id,
            is_correct: isCorrect,
          },
        });
      } catch (err) {
        console.error("Error saving attempt:", err);
      }
    }

    return res.json({
      isCorrect,
      correctAnswer: correctWords.join(" "),
      correctWords: normalizedCorrect,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/listening/progress?level=N5 - Tiến độ theo từng item (đã học, đúng/sai, số lần sai)
export const getProgress = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({ byItem: {} });
    }
    const { level } = req.query;
    if (!level) {
      return res.status(400).json({ message: "Thiếu tham số level" });
    }
    const sets = await prisma.listening_sets.findMany({
      where: { jlpt_level: level, is_published: true },
      include: { items: { select: { item_id: true } } },
    });
    const itemIds = sets.flatMap((s) => s.items.map((i) => i.item_id));
    if (itemIds.length === 0) {
      return res.json({ byItem: {} });
    }
    const attempts = await prisma.listening_attempts.findMany({
      where: {
        user_id: req.user.user_id,
        item_id: { in: itemIds },
      },
      orderBy: { created_at: "asc" },
    });
    const byItem = {};
    for (const a of attempts) {
      if (!byItem[a.item_id]) {
        byItem[a.item_id] = { attempted: false, lastCorrect: false, wrongCount: 0 };
      }
      byItem[a.item_id].attempted = true;
      byItem[a.item_id].lastCorrect = a.is_correct;
      if (!a.is_correct) byItem[a.item_id].wrongCount += 1;
    }
    return res.json({ byItem });
  } catch (err) {
    next(err);
  }
};

// ADMIN ENDPOINTS

export const getAdminListeningSets = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const level = req.query.level;

    const where = {};
    if (level) {
      where.jlpt_level = level;
    }

    const [sets, total] = await Promise.all([
      prisma.listening_sets.findMany({
        where,
        orderBy: { set_id: "asc" },
        include: {
          items: {
            select: { item_id: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.listening_sets.count({ where }),
    ]);

    const allItemIds = sets.flatMap((s) => s.items.map((i) => i.item_id));
    let attemptsByItem = {};

    if (allItemIds.length > 0) {
      const attempts = await prisma.listening_attempts.findMany({
        where: { item_id: { in: allItemIds } },
        select: {
          item_id: true,
          is_correct: true,
        },
      });

      attemptsByItem = attempts.reduce((acc, a) => {
        if (!acc[a.item_id]) {
          acc[a.item_id] = { total: 0, correct: 0 };
        }
        acc[a.item_id].total += 1;
        if (a.is_correct) {
          acc[a.item_id].correct += 1;
        }
        return acc;
      }, {});
    }

    const data = sets.map((set) => {
      const itemIds = set.items.map((i) => i.item_id);
      let totalAttempts = 0;
      let correctAttempts = 0;

      itemIds.forEach((id) => {
        const stats = attemptsByItem[id];
        if (stats) {
          totalAttempts += stats.total;
          correctAttempts += stats.correct;
        }
      });

      const accuracy =
        totalAttempts > 0
          ? Math.round((correctAttempts / totalAttempts) * 100)
          : 0;

      return {
        set_id: set.set_id,
        title: set.title,
        jlpt_level: set.jlpt_level,
        description: set.description,
        is_published: set.is_published,
        created_at: set.created_at,
        itemsCount: set.items.length,
        totalAttempts,
        accuracy,
      };
    });

    return res.json({ items: data, total, page, limit });
  } catch (err) {
    next(err);
  }
};

export const createAdminListeningSet = async (req, res, next) => {
  try {
    const { title, jlpt_level, is_published } = req.body;

    if (!title || !jlpt_level) {
      return res
        .status(400)
        .json({ message: "Thiếu title hoặc jlpt_level" });
    }

    const created = await prisma.listening_sets.create({
      data: {
        title,
        jlpt_level,
        is_published: Boolean(is_published),
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const updateAdminListeningSet = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "setId không hợp lệ" });
    }

    const { title, jlpt_level, is_published } = req.body;
    const data = {};

    if (title !== undefined) data.title = title;
    if (jlpt_level !== undefined) data.jlpt_level = jlpt_level;
    if (is_published !== undefined) {
      data.is_published = Boolean(is_published);
    }

    const updated = await prisma.listening_sets.update({
      where: { set_id: id },
      data,
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteAdminListeningSet = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "setId không hợp lệ" });
    }

    await prisma.$transaction(async (tx) => {
      const items = await tx.listening_items.findMany({
        where: { set_id: id },
        select: { item_id: true },
      });
      const itemIds = items.map((i) => i.item_id);

      if (itemIds.length > 0) {
        await tx.listening_attempts.deleteMany({
          where: { item_id: { in: itemIds } },
        });
      }

      await tx.listening_items.deleteMany({ where: { set_id: id } });
      await tx.listening_sets.delete({ where: { set_id: id } });
    });

    return res.json({ message: "Đã xóa bộ bài nghe" });
  } catch (err) {
    next(err);
  }
};

export const getAdminListeningItemsBySet = async (req, res, next) => {
  try {
    const setId = Number(req.params.setId);
    if (Number.isNaN(setId)) {
      return res.status(400).json({ message: "setId không hợp lệ" });
    }

    const items = await prisma.listening_items.findMany({
      where: { set_id: setId },
      orderBy: { item_id: "asc" },
    });

    const itemIds = items.map((i) => i.item_id);
    let attemptsByItem = {};

    if (itemIds.length > 0) {
      const attempts = await prisma.listening_attempts.findMany({
        where: { item_id: { in: itemIds } },
        select: {
          item_id: true,
          is_correct: true,
        },
      });

      attemptsByItem = attempts.reduce((acc, a) => {
        if (!acc[a.item_id]) {
          acc[a.item_id] = { total: 0, correct: 0 };
        }
        acc[a.item_id].total += 1;
        if (a.is_correct) {
          acc[a.item_id].correct += 1;
        }
        return acc;
      }, {});
    }

    const formatted = items.map((item) => {
      let options = [];
      let words = [];
      try {
        if (item.options_json) {
          options = JSON.parse(item.options_json);
        }
      } catch {
        options = [];
      }
      try {
        if (item.words_json) {
          words = JSON.parse(item.words_json);
        }
      } catch {
        words = [];
      }

      const stats = attemptsByItem[item.item_id] || {
        total: 0,
        correct: 0,
      };
      const accuracy =
        stats.total > 0
          ? Math.round((stats.correct / stats.total) * 100)
          : 0;

      return {
        item_id: item.item_id,
        set_id: item.set_id,
        exercise_type: item.exercise_type,
        question: item.question,
        audio_url: resolveAudioUrl(item.audio_url),
        transcript_jp: item.transcript_jp,
        explain_viet: item.explain_viet,
        options,
        words,
        correct_index: item.correct_index,
        totalAttempts: stats.total,
        accuracy,
      };
    });

    return res.json({ items: formatted });
  } catch (err) {
    next(err);
  }
};

export const createAdminListeningItem = async (req, res, next) => {
  try {
    const setId = Number(req.params.setId);
    if (Number.isNaN(setId)) {
      return res.status(400).json({ message: "setId không hợp lệ" });
    }

    const {
      exercise_type,
      question,
      audio_url,
      transcript_jp,
      explain_viet,
      options,
      words,
      correct_index,
    } = req.body;

    if (!exercise_type || !question) {
      return res
        .status(400)
        .json({ message: "Thiếu exercise_type hoặc question" });
    }

    const created = await prisma.listening_items.create({
      data: {
        set_id: setId,
        exercise_type,
        question,
        audio_url: audio_url || null,
        transcript_jp: transcript_jp || null,
        explain_viet: explain_viet || null,
        options_json: options ? JSON.stringify(options) : null,
        words_json: words ? JSON.stringify(words) : null,
        correct_index:
          correct_index !== undefined && correct_index !== null
            ? Number(correct_index)
            : null,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const updateAdminListeningItem = async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    if (Number.isNaN(itemId)) {
      return res.status(400).json({ message: "itemId không hợp lệ" });
    }

    const {
      exercise_type,
      question,
      audio_url,
      transcript_jp,
      explain_viet,
      options,
      words,
      correct_index,
    } = req.body;

    const data = {};

    if (exercise_type !== undefined) data.exercise_type = exercise_type;
    if (question !== undefined) data.question = question;
    if (audio_url !== undefined) data.audio_url = audio_url;
    if (transcript_jp !== undefined) data.transcript_jp = transcript_jp;
    if (explain_viet !== undefined) data.explain_viet = explain_viet;
    if (options !== undefined) {
      data.options_json = options ? JSON.stringify(options) : null;
    }
    if (words !== undefined) {
      data.words_json = words ? JSON.stringify(words) : null;
    }
    if (correct_index !== undefined) {
      data.correct_index =
        correct_index === null || correct_index === ""
          ? null
          : Number(correct_index);
    }

    const updated = await prisma.listening_items.update({
      where: { item_id: itemId },
      data,
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteAdminListeningItem = async (req, res, next) => {
  try {
    const itemId = Number(req.params.itemId);
    if (Number.isNaN(itemId)) {
      return res.status(400).json({ message: "itemId không hợp lệ" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.listening_attempts.deleteMany({
        where: { item_id: itemId },
      });
      await tx.listening_items.delete({
        where: { item_id: itemId },
      });
    });

    return res.json({ message: "Đã xóa câu hỏi nghe" });
  } catch (err) {
    next(err);
  }
};

export const getAdminListeningStatsOverview = async (req, res, next) => {
  try {
    const level = req.query.level;

    const whereSets = {};
    if (level) {
      whereSets.jlpt_level = level;
    }

    const sets = await prisma.listening_sets.findMany({
      where: whereSets,
      include: {
        items: {
          select: { item_id: true, question: true, set_id: true },
        },
      },
    });

    const allItems = sets.flatMap((set) =>
      set.items.map((item) => ({
        item_id: item.item_id,
        question: item.question,
        set_id: set.set_id,
        set_title: set.title,
      }))
    );

    const itemIds = allItems.map((i) => i.item_id);
    if (itemIds.length === 0) {
      return res.json({
        totalSets: sets.length,
        totalItems: 0,
        totalAttempts: 0,
        averageAccuracy: 0,
        hardestItems: [],
      });
    }

    const attempts = await prisma.listening_attempts.findMany({
      where: { item_id: { in: itemIds } },
      select: {
        item_id: true,
        is_correct: true,
      },
    });

    const byItem = attempts.reduce((acc, a) => {
      if (!acc[a.item_id]) {
        acc[a.item_id] = { total: 0, correct: 0 };
      }
      acc[a.item_id].total += 1;
      if (a.is_correct) {
        acc[a.item_id].correct += 1;
      }
      return acc;
    }, {});

    let totalAttempts = 0;
    let totalCorrect = 0;

    const withStats = allItems.map((item) => {
      const stats = byItem[item.item_id] || { total: 0, correct: 0 };
      totalAttempts += stats.total;
      totalCorrect += stats.correct;
      const accuracy =
        stats.total > 0
          ? Math.round((stats.correct / stats.total) * 100)
          : 0;
      return {
        ...item,
        totalAttempts: stats.total,
        accuracy,
      };
    });

    const averageAccuracy =
      totalAttempts > 0
        ? Math.round((totalCorrect / totalAttempts) * 100)
        : 0;

    const hardestItems = withStats
      .filter((i) => i.totalAttempts >= 5)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    return res.json({
      totalSets: sets.length,
      totalItems: allItems.length,
      totalAttempts,
      averageAccuracy,
      hardestItems,
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminListeningStatsBySet = async (req, res, next) => {
  try {
    const setId = Number(req.params.setId);
    if (Number.isNaN(setId)) {
      return res.status(400).json({ message: "setId không hợp lệ" });
    }

    const items = await prisma.listening_items.findMany({
      where: { set_id: setId },
      select: {
        item_id: true,
        question: true,
      },
    });

    const itemIds = items.map((i) => i.item_id);
    if (itemIds.length === 0) {
      return res.json({ items: [] });
    }

    const attempts = await prisma.listening_attempts.findMany({
      where: { item_id: { in: itemIds } },
      select: {
        item_id: true,
        is_correct: true,
      },
    });

    const byItem = attempts.reduce((acc, a) => {
      if (!acc[a.item_id]) {
        acc[a.item_id] = { total: 0, correct: 0 };
      }
      acc[a.item_id].total += 1;
      if (a.is_correct) {
        acc[a.item_id].correct += 1;
      }
      return acc;
    }, {});

    const mapped = items.map((item) => {
      const stats = byItem[item.item_id] || { total: 0, correct: 0 };
      const accuracy =
        stats.total > 0
          ? Math.round((stats.correct / stats.total) * 100)
          : 0;
      return {
        item_id: item.item_id,
        question: item.question,
        totalAttempts: stats.total,
        correctAttempts: stats.correct,
        accuracy,
      };
    });

    return res.json({ items: mapped });
  } catch (err) {
    next(err);
  }
};

