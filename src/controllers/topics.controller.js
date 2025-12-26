// src/controllers/topics.controller.js
import { prisma } from "../prisma.js";

// GET /api/topics?level=N5
export const getTopics = async (req, res) => {
  const { level } = req.query;

  try {
    // Get all topics with count of vocabularies
    const topics = await prisma.topics.findMany({
      orderBy: { topic_id: "asc" },
      include: {
        _count: {
          select: { vocabitems: true }
        }
      }
    });

    res.json(topics);
  } catch (err) {
    console.error("Get topics error:", err);
    res
      .status(500)
      .json({ error: "Không lấy được danh sách chủ đề", detail: err.message });
  }
};

// GET /api/topics/:topicId/vocab?level=N5
export const getTopicVocab = async (req, res) => {
  const topicId = Number(req.params.topicId);
  const { level } = req.query;

  if (!topicId || isNaN(topicId)) {
    return res.status(400).json({ error: "topicId không hợp lệ" });
  }

  try {
    const topic = await prisma.topics.findUnique({
      where: { topic_id: topicId },
    });

    if (!topic) {
      return res.status(404).json({ error: "Không tìm thấy chủ đề" });
    }

    // Get vocabulary items filtered by topic_id and optionally by level
    const where = { topic_id: topicId };
    if (level) {
      where.jlpt_level = level;
    }

    const vocab = await prisma.vocabitems.findMany({
      where,
      orderBy: { vocab_id: "asc" },
    });

    res.json({ topic, vocab });
  } catch (err) {
    console.error("Get topic vocab error:", err.message);
    res.status(500).json({
      error: "Không lấy được từ vựng của chủ đề",
      detail: err.message,
    });
  }
};
