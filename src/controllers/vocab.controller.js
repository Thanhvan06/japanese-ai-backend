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
