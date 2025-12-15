import { prisma } from "../prisma.js";

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