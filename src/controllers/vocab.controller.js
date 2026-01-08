import { prisma } from "../prisma.js";
import { z } from "zod";
import { recordAdminAudit } from "../services/adminAudit.service.js";

// ----- Admin Schemas -----
const createVocabSchema = z.object({
  word: z.string().min(1, "Word là bắt buộc"),
  meaning: z.string().min(1, "Meaning là bắt buộc"),
  furigana: z.string().min(1, "Furigana là bắt buộc"),
  image_url: z.string().nullable().optional(),
  jlpt_level: z.enum(["N5", "N4", "N3", "N2", "N1"], {
    errorMap: () => ({ message: "JLPT level phải là N5, N4, N3, N2, hoặc N1" }),
  }),
  is_published: z.boolean().optional().default(false),
  topic_id: z.union([z.number().int().positive(), z.null()]).optional(),
});

const updateVocabSchema = z.object({
  word: z.string().min(1).optional(),
  meaning: z.string().min(1).optional(),
  furigana: z.string().min(1).optional(),
  image_url: z.string().nullable().optional(),
  jlpt_level: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional(),
  is_published: z.boolean().optional(),
  topic_id: z.union([z.number().int().positive(), z.null()]).optional(),
});

// GET /api/vocab?level=N5
export const getVocabByLevel = async (req, res, next) => {
  try {
    const { level } = req.query;
    
    if (!level) {
      return res.status(400).json({
        message: "Thiếu tham số level (N5, N4, N3, N2, N1)",
      });
    }

    const items = await prisma.vocabitems.findMany({
      where: {
        jlpt_level: `${level}`,
        is_published: true,
      },
      orderBy: { vocab_id: "asc" },
    });

    return res.json({ items });
  } catch (err) {
    next(err);
  }
};

// GET /api/vocab/practice/matching?level=N5&limit=10
export const getMatchingCards = async (req, res, next) => {
  try {
    const { level, limit = 10 } = req.query;
    
    if (!level) {
      return res.status(400).json({
        message: "Thiếu tham số level (N5, N4, N3, N2, N1)",
      });
    }

    const items = await prisma.vocabitems.findMany({
      where: {
        jlpt_level: `${level}`,
        is_published: true,
      },
      take: parseInt(limit) * 2,
    });

    if (items.length < 2) {
      return res.status(400).json({
        message: "Không đủ từ vựng để tạo bài tập",
      });
    }

    // Shuffle items
    const shuffled = items.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(parseInt(limit) * 2, shuffled.length));
    
    // Create pairs
    const pairs = [];
    for (let i = 0; i < selected.length; i += 2) {
      if (i + 1 < selected.length) {
        pairs.push({
          id: pairs.length + 1,
          word1: {
            vocab_id: selected[i].vocab_id,
            word: selected[i].word,
            furigana: selected[i].furigana,
          },
          word2: {
            vocab_id: selected[i + 1].vocab_id,
            word: selected[i + 1].word,
            furigana: selected[i + 1].furigana,
          },
          meanings: [
            { vocab_id: selected[i].vocab_id, meaning: selected[i].meaning },
            { vocab_id: selected[i + 1].vocab_id, meaning: selected[i + 1].meaning },
          ].sort(() => Math.random() - 0.5),
        });
      }
    }

    return res.json({ pairs });
  } catch (err) {
    next(err);
  }
};

// GET /api/vocab/practice/test?level=N5&limit=10&type=image|kanji-hiragana|hiragana-kanji|word-meaning&topic=1&flashcardSetId=1
export const getTestQuestions = async (req, res, next) => {
  try {
    const { level, topic, flashcardSetId, limit = 10, type = "image" } = req.query;
    
    const validTypes = ["image", "kanji-hiragana", "hiragana-kanji", "word-meaning"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: `Loại test không hợp lệ. Chọn một trong: ${validTypes.join(", ")}`,
      });
    }

    // Build where clause
    const where = {
      is_published: true,
    };

    if (level) {
      where.jlpt_level = `${level}`;
    }

    if (topic) {
      where.topic_id = parseInt(topic);
    }

    // Filter by image_url if type is image
    if (type === "image") {
      where.image_url = { not: null };
    }

    // If flashcardSetId is provided, get vocab IDs from flashcard set
    let vocabIds = null;
    if (flashcardSetId) {
      if (!req.user) {
        return res.status(401).json({
          message: "Cần đăng nhập để sử dụng flashcard set",
        });
      }

      const flashcardSet = await prisma.fcsets.findFirst({
        where: {
          set_id: parseInt(flashcardSetId),
          user_id: req.user.user_id,
        },
        include: {
          fccards: true,
        },
      });

      if (!flashcardSet) {
        return res.status(404).json({
          message: "Không tìm thấy flashcard set",
        });
      }

      // Extract vocab IDs from flashcard cards (matching by word)
      const setWords = flashcardSet.fccards.map(c => c.side_jp.trim());
      const vocabItems = await prisma.vocabitems.findMany({
        where: {
          word: { in: setWords },
          is_published: true,
        },
        select: { vocab_id: true },
      });
      vocabIds = vocabItems.map(v => v.vocab_id);
    }

    if (vocabIds && vocabIds.length === 0) {
      return res.status(400).json({
        message: "Flashcard set không chứa từ vựng hợp lệ",
      });
    }

    if (vocabIds) {
      where.vocab_id = { in: vocabIds };
    }

    const allItems = await prisma.vocabitems.findMany({
      where,
    });

    if (allItems.length === 0) {
      return res.status(400).json({
        message: "Không tìm thấy từ vựng phù hợp",
      });
    }

    const questionLimit = Math.min(parseInt(limit), allItems.length);
    const minQuestions = Math.min(10, allItems.length);
    
    if (questionLimit < minQuestions) {
      return res.status(400).json({
        message: `Số câu hỏi phải tối thiểu ${minQuestions} (tối đa ${allItems.length})`,
      });
    }

    // Shuffle and select unique vocab
    const shuffled = [...allItems].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, questionLimit);

    // Generate questions based on type
    const questions = selected.map((item, index) => {
      // Get wrong answers from remaining items
      const wrongItems = shuffled.filter((v) => v.vocab_id !== item.vocab_id);
      
      if (type === "image") {
        // image → word
        const wrongAnswers = wrongItems
          .slice(0, 3)
          .map((v) => v.word);
        const allOptions = [item.word, ...wrongAnswers].sort(() => Math.random() - 0.5);
        const correctIndex = allOptions.indexOf(item.word);
        
        return {
          question_id: index + 1,
          type: "image",
          question: item.image_url,
          options: allOptions,
          correctIndex,
        };
      } else if (type === "kanji-hiragana") {
        // kanji → hiragana
        const wrongAnswers = wrongItems
          .slice(0, 3)
          .map((v) => v.furigana);
        const allOptions = [item.furigana, ...wrongAnswers].sort(() => Math.random() - 0.5);
        const correctIndex = allOptions.indexOf(item.furigana);
        
        return {
          question_id: index + 1,
          type: "kanji-hiragana",
          question: item.word,
          options: allOptions,
          correctIndex,
        };
      } else if (type === "hiragana-kanji") {
        // hiragana → kanji
        const wrongAnswers = wrongItems
          .slice(0, 3)
          .map((v) => v.word);
        const allOptions = [item.word, ...wrongAnswers].sort(() => Math.random() - 0.5);
        const correctIndex = allOptions.indexOf(item.word);
        
        return {
          question_id: index + 1,
          type: "hiragana-kanji",
          question: item.furigana,
          options: allOptions,
          correctIndex,
        };
      } else {
        // word → meaning
        const wrongAnswers = wrongItems
          .slice(0, 3)
          .map((v) => v.meaning);
        const allOptions = [item.meaning, ...wrongAnswers].sort(() => Math.random() - 0.5);
        const correctIndex = allOptions.indexOf(item.meaning);
        
        return {
          question_id: index + 1,
          type: "word-meaning",
          question: item.word,
          questionFurigana: item.furigana,
          options: allOptions,
          correctIndex,
        };
      }
    });

    return res.json({ questions, total: questions.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/vocab/practice/sentence?level=N5&limit=10
export const getSentenceOrdering = async (req, res, next) => {
  try {
    const { level, limit = 10 } = req.query;
    
    if (!level) {
      return res.status(400).json({
        message: "Thiếu tham số level (N5, N4, N3, N2, N1)",
      });
    }

    const questionLimit = parseInt(limit);
    const allItems = await prisma.vocabitems.findMany({
      where: {
        jlpt_level: `${level}`,
        is_published: true,
      },
    });

    if (allItems.length < questionLimit) {
      return res.status(400).json({
        message: "Không đủ từ vựng để tạo bài tập",
      });
    }

    // Shuffle and select
    const shuffled = allItems.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, questionLimit);

    const questions = selected.map((item, index) => {
      // Create simple sentence: "これは [word] です。"
      const sentenceParts = ["これは", item.word, "です。"];
      const shuffledParts = [...sentenceParts].sort(() => Math.random() - 0.5);
      
      return {
        question_id: index + 1,
        correct_order: sentenceParts,
        shuffled_words: shuffledParts,
        meaning: item.meaning,
        furigana: `これは${item.furigana}です。`,
      };
    });

    return res.json({ questions });
  } catch (err) {
    next(err);
  }
};

// ========== ADMIN CRUD OPERATIONS ==========

// GET /api/admin/vocab - List vocab items with filters and pagination
export const listVocab = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const { jlpt_level, is_published, topic_id } = req.query;

    const where = {};

    // Filter by jlpt_level
    if (jlpt_level) {
      const validLevels = ["N5", "N4", "N3", "N2", "N1"];
      if (validLevels.includes(jlpt_level)) {
        where.jlpt_level = jlpt_level;
      }
    }

    // Filter by is_published
    if (is_published !== undefined) {
      where.is_published = is_published === "true" || is_published === true;
    }

    // Filter by topic_id
    if (topic_id !== undefined) {
      const topicIdNum = Number(topic_id);
      if (!isNaN(topicIdNum) && topicIdNum > 0) {
        where.topic_id = topicIdNum;
      }
    }

    const [items, total] = await Promise.all([
      prisma.vocabitems.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { vocab_id: "desc" },
      }),
      prisma.vocabitems.count({ where }),
    ]);

    res.json({
      items: items || [],
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/vocab/:id - Get single vocab item
export const getVocab = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const item = await prisma.vocabitems.findUnique({
      where: { vocab_id: id },
    });

    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy từ vựng" });
    }

    res.json({ item });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/vocab - Create new vocab item
export const createVocab = async (req, res, next) => {
  try {
    const data = createVocabSchema.parse(req.body);

    // Validate topic_id exists if provided
    if (data.topic_id !== null && data.topic_id !== undefined) {
      const topic = await prisma.topics.findUnique({
        where: { topic_id: data.topic_id },
      });
      if (!topic) {
        return res.status(400).json({ message: "Topic không tồn tại" });
      }
    }

    const item = await prisma.vocabitems.create({
      data: {
        word: data.word,
        meaning: data.meaning,
        furigana: data.furigana,
        image_url: data.image_url ?? null,
        jlpt_level: data.jlpt_level,
        is_published: data.is_published ?? false,
        topic_id: data.topic_id ?? null,
      },
    });

    // Record audit
    try {
      await recordAdminAudit(req.user.user_id, "create_vocab", null, {
        vocab_id: item.vocab_id,
        word: item.word,
      });
    } catch {}

    res.status(201).json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: err.errors,
      });
    }
    next(err);
  }
};

// PATCH /api/admin/vocab/:id - Update vocab item
export const updateVocab = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const existing = await prisma.vocabitems.findUnique({
      where: { vocab_id: id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy từ vựng" });
    }

    const data = updateVocabSchema.parse(req.body);

    // Validate topic_id exists if provided
    if (data.topic_id !== null && data.topic_id !== undefined) {
      const topic = await prisma.topics.findUnique({
        where: { topic_id: data.topic_id },
      });
      if (!topic) {
        return res.status(400).json({ message: "Topic không tồn tại" });
      }
    }

    const updateData = {};
    if (data.word !== undefined) updateData.word = data.word;
    if (data.meaning !== undefined) updateData.meaning = data.meaning;
    if (data.furigana !== undefined) updateData.furigana = data.furigana;
    if (data.image_url !== undefined) updateData.image_url = data.image_url;
    if (data.jlpt_level !== undefined) updateData.jlpt_level = data.jlpt_level;
    if (data.is_published !== undefined)
      updateData.is_published = data.is_published;
    if (data.topic_id !== undefined) updateData.topic_id = data.topic_id;

    const item = await prisma.vocabitems.update({
      where: { vocab_id: id },
      data: updateData,
    });

    // Record audit
    try {
      await recordAdminAudit(req.user.user_id, "update_vocab", null, {
        vocab_id: id,
        changes: data,
      });
    } catch {}

    res.json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: err.errors,
      });
    }
    next(err);
  }
};

// DELETE /api/admin/vocab/:id - Delete vocab item
export const deleteVocab = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const existing = await prisma.vocabitems.findUnique({
      where: { vocab_id: id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy từ vựng" });
    }

    await prisma.vocabitems.delete({
      where: { vocab_id: id },
    });

    // Record audit
    try {
      await recordAdminAudit(req.user.user_id, "delete_vocab", null, {
        vocab_id: id,
        word: existing.word,
      });
    } catch {}

    res.json({ message: "Đã xóa từ vựng" });
  } catch (err) {
    next(err);
  }
};