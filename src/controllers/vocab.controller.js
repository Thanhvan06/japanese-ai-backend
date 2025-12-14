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

// GET /api/vocab/practice/test?level=N5&limit=10&type=image|fillblank
export const getTestQuestions = async (req, res, next) => {
  try {
    const { level, limit = 10, type = "image" } = req.query;
    
    if (!level) {
      return res.status(400).json({
        message: "Thiếu tham số level (N5, N4, N3, N2, N1)",
      });
    }

    if (type !== "image" && type !== "fillblank") {
      return res.status(400).json({
        message: "Loại test không hợp lệ (image hoặc fillblank)",
      });
    }

    const questionLimit = parseInt(limit);
    const allItems = await prisma.vocabitems.findMany({
      where: {
        jlpt_level: `${level}`,
        is_published: true,
        ...(type === "image" ? { image_url: { not: null } } : {}),
      },
    });

    if (allItems.length < questionLimit) {
      return res.status(400).json({
        message: "Không đủ từ vựng để tạo bài test",
      });
    }

    // Shuffle and select
    const shuffled = allItems.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, questionLimit);

    const questions = selected.map((item, index) => {
      if (type === "image") {
        // Image guessing: show image, guess the word
        const wrongAnswers = shuffled
          .filter((v) => v.vocab_id !== item.vocab_id)
          .slice(0, 3)
          .map((v) => v.word);
        
        const allAnswers = [item.word, ...wrongAnswers].sort(() => Math.random() - 0.5);
        
        return {
          question_id: index + 1,
          type: "image",
          image_url: item.image_url,
          correct_answer: item.word,
          answers: allAnswers,
        };
      } else {
        // Fill blank: sentence with blank, multiple choice
        const wrongAnswers = shuffled
          .filter((v) => v.vocab_id !== item.vocab_id)
          .slice(0, 3)
          .map((v) => v.meaning);
        
        const allAnswers = [item.meaning, ...wrongAnswers].sort(() => Math.random() - 0.5);
        
        // Create simple sentence template
        const sentence = `これは${item.word}です。`;
        const sentenceWithBlank = sentence.replace(item.word, "_____");
        
        return {
          question_id: index + 1,
          type: "fillblank",
          sentence: sentenceWithBlank,
          sentence_furigana: `これは${item.furigana}です。`,
          correct_answer: item.meaning,
          answers: allAnswers,
        };
      }
    });

    return res.json({ questions });
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