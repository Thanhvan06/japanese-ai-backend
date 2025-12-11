import { prisma } from "../prisma.js";

// GET /api/grammar?level=N5
export const getGrammarByLevel = async (req, res, next) => {
  try {
    const { level } = req.query;

    if (!level) {
      return res.status(400).json({
        message: "Thiếu tham số level (N5, N4, N3, N2, N1)",
      });
    }

    const items = await prisma.grammarrules.findMany({
      where: {
        jlpt_level: level,
        is_published: true,
      },
      orderBy: { grammar_id: "asc" },
      select: {
        grammar_id: true,
        grammar_structure: true,
        jlpt_level: true,
      },
    });

    return res.json({ items });
  } catch (err) {
    next(err);
  }
};

// GET /api/grammar/:id
export const getGrammarDetail = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "grammarId không hợp lệ" });
    }

    const grammar = await prisma.grammarrules.findUnique({
      where: { grammar_id: id },
      select: {
        grammar_id: true,
        grammar_structure: true,
        explanation_viet: true,
        example_jp: true,
        example_viet: true,
        jlpt_level: true,
      },
    });

    if (!grammar) {
      return res.status(404).json({ message: "Không tìm thấy mẫu ngữ pháp" });
    }

    return res.json(grammar);
  } catch (err) {
    next(err);
  }
};
