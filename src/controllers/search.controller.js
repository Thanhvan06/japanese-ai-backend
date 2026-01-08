import { prisma } from "../prisma.js";

export const searchAll = async (req, res, next) => {
  try {
    const { q = "", type = "all", limit = 20 } = req.query;

    console.debug(`[search] incoming q="${q}", type=${type}, limit=${limit}`);

    if (!q.trim()) {
      return res.json({ items: [] });
    }

    const take = Number(limit);

    const results = [];

    // 🔹 Search vocab (return fuller details)
    // By default include unpublished items so seeded/dev data appears.
    if (type === "all" || type === "vocab") {
      // MySQL LIKE is case-insensitive by default, so no need for mode
      const vocabs = await prisma.vocabitems.findMany({
        where: {
          OR: [
            { word: { contains: q } },
            { meaning: { contains: q } },
            { furigana: { contains: q } },
          ],
        },
        take,
        include: {
          topics: {
            select: { topic_id: true, topic_name: true },
          },
        },
      });

      vocabs.forEach((v) =>
        results.push({
          _type: "vocab",
          vocab_id: v.vocab_id,
          word: v.word,
          furigana: v.furigana,
          meaning: v.meaning,
          jlpt_level: v.jlpt_level,
          image_url: v.image_url,
          topic: v.topics || null,
        })
      );
    }

    // 🔹 Search grammar (return fuller details)
    if (type === "all" || type === "grammar") {
      // MySQL LIKE is case-insensitive by default, so no need for mode
      const grammars = await prisma.grammar.findMany({
        where: {
          OR: [
            { grammar_structure: { contains: q } },
            { explanation_viet: { contains: q } },
            { example_jp: { contains: q } },
          ],
        },
        take,
      });

      grammars.forEach((g) =>
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
