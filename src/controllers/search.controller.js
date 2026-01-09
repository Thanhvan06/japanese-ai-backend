import { prisma } from "../prisma.js";

function isVietnameseQuery(query) {
  return /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/.test(query);
}

function matchesWordBoundary(text, query) {
  if (!text) return false;
  const queryWords = query.trim().split(/\s+/);
  if (queryWords.length > 1) {
    return text.includes(query);
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  try {
    const pattern = new RegExp(`(^|\\s)${escaped}(\\s|$)`, "iu");
    return pattern.test(text);
  } catch {
    return text.includes(query);
  }
}

export const adminSearch = async (req, res, next) => {
  try {
    const { q = "", type = "all", limit = 20 } = req.query;
    const trimmedQ = q.trim();
    if (!trimmedQ) return res.json({ items: [] });

    const take = Math.min(Number(limit) || 20, 100);
    const results = [];

    if (type === "all" || type === "vocab") {
      const vocabs = await prisma.vocabitems.findMany({
        where: {
          OR: [
            { word: { contains: trimmedQ } },
            { meaning: { contains: trimmedQ } },
            { furigana: { contains: trimmedQ } },
          ],
        },
        take: take * 2,
        include: {
          topics: {
            select: { topic_id: true, topic_name: true },
          },
        },
      });

      const isVietnamese = isVietnameseQuery(trimmedQ);
      let filtered = vocabs;
      if (isVietnamese && trimmedQ.length >= 2) {
        filtered = vocabs.filter((v) => {
          if (v.word.includes(trimmedQ) || (v.furigana && v.furigana.includes(trimmedQ))) {
            return true;
          }
          return matchesWordBoundary(v.meaning, trimmedQ) || v.meaning.includes(trimmedQ);
        });
      }

      filtered.slice(0, take).forEach((v) =>
        results.push({
          _type: "vocab",
          vocab_id: v.vocab_id,
          word: v.word,
          furigana: v.furigana,
          meaning: v.meaning,
          jlpt_level: v.jlpt_level,
          image_url: v.image_url,
          topic_id: v.topics?.topic_id || null,
          topic: v.topics || null,
          is_published: v.is_published ?? false,
        })
      );
    }

    if (type === "all" || type === "grammar") {
      const grammars = await prisma.grammar.findMany({
        where: {
          OR: [
            { grammar_structure: { contains: trimmedQ } },
            { explanation_viet: { contains: trimmedQ } },
            { example_jp: { contains: trimmedQ } },
          ],
        },
        take: take * 2,
      });

      const isVietnamese = isVietnameseQuery(trimmedQ);
      let filtered = grammars;
      if (isVietnamese && trimmedQ.length >= 2) {
        filtered = grammars.filter((g) => {
          if (g.grammar_structure.includes(trimmedQ) || (g.example_jp && g.example_jp.includes(trimmedQ))) {
            return true;
          }
          return matchesWordBoundary(g.explanation_viet, trimmedQ) || g.explanation_viet.includes(trimmedQ);
        });
      }

      filtered.slice(0, take).forEach((g) =>
        results.push({
          _type: "grammar",
          grammar_id: g.grammar_id,
          grammar_structure: g.grammar_structure,
          explanation_viet: g.explanation_viet,
          example_jp: g.example_jp,
          example_viet: g.example_viet,
          jlpt_level: g.jlpt_level,
          is_published: g.is_published ?? false,
        })
      );
    }

    return res.json({ items: results });
  } catch (err) {
    next(err);
  }
};

export const searchAll = async (req, res, next) => {
  try {
    const { q = "", type = "all", limit = 20 } = req.query;

    console.debug(`[search] incoming q="${q}", type=${type}, limit=${limit}`);

    const trimmedQ = q.trim();
    if (!trimmedQ) {
      return res.json({ items: [] });
    }

    const take = Number(limit);
    const isVietnamese = isVietnameseQuery(trimmedQ);
    const results = [];

    if (type === "all" || type === "vocab") {
      const vocabs = await prisma.vocabitems.findMany({
        where: {
          OR: [
            { word: { contains: trimmedQ } },
            { meaning: { contains: trimmedQ } },
            { furigana: { contains: trimmedQ } },
          ],
        },
        take: take * 2,
        include: {
          topics: {
            select: { topic_id: true, topic_name: true },
          },
        },
      });

      let filtered = vocabs;
      if (isVietnamese && trimmedQ.length >= 2) {
        filtered = vocabs.filter((v) => {
          if (v.word.includes(trimmedQ) || (v.furigana && v.furigana.includes(trimmedQ))) {
            return true;
          }
          return matchesWordBoundary(v.meaning, trimmedQ) || v.meaning.includes(trimmedQ);
        });
      }

      filtered.slice(0, take).forEach((v) =>
        results.push({
          _type: "vocab",
          vocab_id: v.vocab_id,
          word: v.word,
          furigana: v.furigana,
          meaning: v.meaning,
          jlpt_level: v.jlpt_level,
          image_url: v.image_url,
          topic_id: v.topics?.topic_id || null,
          topic: v.topics || null,
        })
      );
    }

    if (type === "all" || type === "grammar") {
      const grammars = await prisma.grammar.findMany({
        where: {
          OR: [
            { grammar_structure: { contains: trimmedQ } },
            { explanation_viet: { contains: trimmedQ } },
            { example_jp: { contains: trimmedQ } },
          ],
        },
        take: take * 2,
      });

      let filtered = grammars;
      if (isVietnamese && trimmedQ.length >= 2) {
        filtered = grammars.filter((g) => {
          if (g.grammar_structure.includes(trimmedQ) || (g.example_jp && g.example_jp.includes(trimmedQ))) {
            return true;
          }
          return matchesWordBoundary(g.explanation_viet, trimmedQ) || g.explanation_viet.includes(trimmedQ);
        });
      }

      filtered.slice(0, take).forEach((g) =>
        results.push({
          _type: "grammar",
          grammar_id: g.grammar_id,
          grammar_structure: g.grammar_structure,
          explanation_viet: g.explanation_viet,
          example_jp: g.example_jp,
          example_viet: g.example_viet,
          jlpt_level: g.jlpt_level,
        })
      );
    }

    console.debug(`[search] returning ${results.length} items`);
    res.json({ items: results });
  } catch (err) {
    next(err);
  }
};
