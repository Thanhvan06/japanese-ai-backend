// src/controllers/topics.controller.js
import { prisma } from "../prisma.js";

// GET /api/topics?level=N5
export const getTopics = async (req, res) => {
  const { level } = req.query;

  try {
    const where = level ? { jlpt_level: level } : {};

    const topics = await prisma.topics.findMany({
      where,
      orderBy: { topic_id: "asc" },
    });

    res.json(topics);
  } catch (err) {
    console.error("Get topics error:", err);
    res
      .status(500)
      .json({ error: "Không lấy được danh sách chủ đề", detail: err.message });
  }
};

// GET /api/topics/:topicId/vocab
export const getTopicVocab = async (req, res) => {
  const topicId = Number(req.params.topicId);

  if (!topicId) {
    return res.status(400).json({ error: "topicId không hợp lệ" });
  }

  try {
    const topic = await prisma.topics.findUnique({
      where: { topic_id: topicId },
    });

    if (!topic) {
      return res.status(404).json({ error: "Không tìm thấy chủ đề" });
    }

    const vocab = await prisma.vocabitems.findMany({
      where: {
        topic_id: topicId,               // <-- nếu bạn dùng bảng trung gian, đổi chỗ này
        // is_published: true,
      },
      orderBy: { vocab_id: "asc" },
    });

    res.json({ topic, vocab });
  } catch (err) {
    console.error("Get topic vocab error:", err);
    res.status(500).json({
      error: "Không lấy được từ vựng của chủ đề",
      detail: err.message,
    });
  }
};
