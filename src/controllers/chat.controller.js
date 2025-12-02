// src/controllers/chat.controller.js
import { prisma } from "../prisma.js";
import axios from "axios";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("Thiếu GEMINI_API_KEY trong .env");
  }

  try {
    const response = await axios.post(
      `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Lấy text từ response
    const candidates = response.data.candidates || [];
    const content = candidates[0]?.content;
    const parts = content?.parts || [];
    const text = parts.map((p) => p.text || "").join("").trim();

    return text || "Xin lỗi, hiện tại tôi không trả lời được.";
  } catch (err) {
    console.error("Gemini HTTP API Error:", err.response?.data || err.message);
    throw new Error(
      err.response?.data?.error?.message || "Lỗi khi gọi Gemini API"
    );
  }
}

// ========== TẠO SESSION MỚI ==========
export const createSession = async (req, res) => {
  const { user_id, topic } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "user_id là bắt buộc" });
  }

  try {
    const session = await prisma.chatsessions.create({
      data: {
        user_id,
        topic: topic ?? null,
      },
    });

    return res.json(session);
  } catch (err) {
    console.error("Create session error:", err);
    return res.status(500).json({ error: "Không tạo được session" });
  }
};

// ========== LẤY DANH SÁCH SESSION THEO USER ==========
export const getSessionsByUser = async (req, res) => {
  const userId = Number(req.query.user_id);

  if (!userId) {
    return res.status(400).json({ error: "user_id là bắt buộc" });
  }

  try {
    const sessions = await prisma.chatsessions.findMany({
      where: { user_id: userId },
      orderBy: { start_time: "desc" },
    });

    return res.json(sessions);
  } catch (err) {
    console.error("Get sessions error:", err);
    return res.status(500).json({ error: "Không lấy được sessions" });
  }
};

// ========== LẤY LỊCH SỬ TIN NHẮN CỦA 1 SESSION ==========
export const getMessagesBySession = async (req, res) => {
  const sessionId = Number(req.params.session_id);

  if (!sessionId) {
    return res.status(400).json({ error: "session_id không hợp lệ" });
  }

  try {
    const messages = await prisma.chatmessages.findMany({
      where: { session_id: sessionId },
      orderBy: { sent_at: "asc" },
    });

    return res.json(messages);
  } catch (err) {
    console.error("Get messages error:", err);
    return res.status(500).json({ error: "Không lấy được messages" });
  }
};

// ========== GỬI TIN NHẮN + GỌI GEMINI ==========
export const sendMessage = async (req, res) => {
  const { session_id, content } = req.body;

  if (!session_id || !content || !content.trim()) {
    return res
      .status(400)
      .json({ error: "session_id và content là bắt buộc" });
  }

  try {
    // 1. Lưu message user
    const userMessage = await prisma.chatmessages.create({
      data: {
        session_id,
        sender_type: "user",
        content,
      },
    });

    // 2. Lấy history
    const history = await prisma.chatmessages.findMany({
      where: { session_id },
      orderBy: { sent_at: "asc" },
      take: 20,
    });

    const historyText = history
      .map((m) =>
        m.sender_type === "user"
          ? `Học viên: ${m.content}`
          : `Giáo viên AI: ${m.content}`
      )
      .join("\n");

    const prompt = `
Bạn là giáo viên tiếng Nhật cho người Việt.
Trả lời ngắn gọn, dễ hiểu (VN là chính), kèm ví dụ JP.
Format:
1) Trả lời nhanh (1-2 câu)
2) Từ vựng (tối đa 5): JP | Kana | Nghĩa
3) Ngữ pháp (tối đa 2): giải thích + ví dụ + dịch
4) Hội thoại (2-3 lượt): JP + dịch
5) Bài tập 1 câu

Lịch sử hội thoại:
${historyText || "(chưa có lịch sử)"}

Câu hỏi mới của học viên:
${content}
    `.trim();

    // 3. Gọi Gemini qua HTTP
    let botText;
    try {
      botText = await callGemini(prompt);
    } catch (apiErr) {
      botText =
        "⚠️ Lỗi gọi Gemini API: " + (apiErr.message || "Không rõ nguyên nhân");
    }

    // 4. Lưu message bot
    const botMessage = await prisma.chatmessages.create({
      data: {
        session_id,
        sender_type: "bot",
        content: botText,
      },
    });

    // 5. Cập nhật topic
    await prisma.chatsessions.update({
      where: { session_id },
      data: { topic: content.slice(0, 100) },
    });

    return res.json({ userMessage, botMessage });
  } catch (err) {
    console.error("Send error (SYSTEM):", err);
    return res.status(500).json({
      error: "Gửi tin thất bại",
      detail: err.message || String(err),
    });
  }
};

// ========== XÓA SESSION ==========
export const deleteSession = async (req, res) => {
  const sessionId = Number(req.params.session_id);
  const userId = Number(req.body.user_id);

  if (!sessionId) {
    return res.status(400).json({ error: "session_id không hợp lệ" });
  }

  if (!userId) {
    return res.status(400).json({ error: "user_id là bắt buộc" });
  }

  try {
    // Kiểm tra quyền sở hữu session
    const session = await prisma.chatsessions.findUnique({
      where: { session_id: sessionId },
    });

    if (!session || session.user_id !== userId) {
      return res.status(403).json({ error: "Không có quyền xóa session này" });
    }

    // Xóa các tin nhắn liên quan
    await prisma.chatmessages.deleteMany({
      where: { session_id: sessionId },
    });

    // Xóa session
    await prisma.chatsessions.delete({
      where: { session_id: sessionId },
    });

    return res.json({ message: "Xóa session thành công" });
  } catch (err) {
    console.error("Delete session error:", err);
    return res.status(500).json({ error: "Không xóa được session" });
  }
};