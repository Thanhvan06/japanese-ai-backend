// src/controllers/chat.controller.js
import { prisma } from "../prisma.js";
import axios from "axios";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(systemInstruction, userMessage, history = []) {
  if (!GEMINI_API_KEY) {
    throw new Error("Thiếu GEMINI_API_KEY trong .env");
  }

  try {
    // Xây dựng conversation history
    const contents = [];
    
    // Thêm lịch sử hội thoại (nếu có)
    if (history.length > 0) {
      history.forEach((msg) => {
        contents.push({
          role: msg.sender_type === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      });
    }

    // Thêm message hiện tại
    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7, // Độ sáng tạo (0-1), 0.7 = cân bằng
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    };

    const response = await axios.post(
      `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
      requestBody,
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
    
    // Fallback: Thử cách cũ nếu systemInstruction không được hỗ trợ
    if (err.response?.status === 400) {
      console.warn("SystemInstruction không được hỗ trợ, dùng prompt truyền thống");
      return callGeminiLegacy(systemInstruction + "\n\n" + userMessage);
    }
    
    throw new Error(
      err.response?.data?.error?.message || "Lỗi khi gọi Gemini API"
    );
  }
}

// Fallback method nếu systemInstruction không được hỗ trợ
async function callGeminiLegacy(prompt) {
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

    const candidates = response.data.candidates || [];
    const content = candidates[0]?.content;
    const parts = content?.parts || [];
    const text = parts.map((p) => p.text || "").join("").trim();

    return text || "Xin lỗi, hiện tại tôi không trả lời được.";
  } catch (err) {
    console.error("Gemini Legacy API Error:", err.response?.data || err.message);
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
    // 1. Lấy history trước (không bao gồm message user sắp tạo)
    const existingHistory = await prisma.chatmessages.findMany({
      where: { session_id },
      orderBy: { sent_at: "asc" },
      take: 19, // Lấy 19 để tổng cộng với message mới = 20
    });

    // 2. Lưu message user
    const userMessage = await prisma.chatmessages.create({
      data: {
        session_id,
        sender_type: "user",
        content,
      },
    });

    // System instruction - định nghĩa vai trò và cách trả lời
    const systemPrompt = `Bạn là ManaVi - một trợ lý AI thông minh và thân thiện, chuyên giúp đỡ người Việt Nam học tiếng Nhật.

VAI TRÒ CỦA BẠN:
- Giáo viên tiếng Nhật: Giải thích ngữ pháp, từ vựng, cách sử dụng một cách dễ hiểu
- Bạn đồng hành: Trả lời các câu hỏi về học tập, cuộc sống, và mọi thứ học viên cần
- Người bạn: Giao tiếp tự nhiên, thân thiện, khuyến khích và động viên

NGUYÊN TẮC TRẢ LỜI:
1. TỰ NHIÊN: Trả lời như đang nói chuyện với bạn, không cần format cứng nhắc
2. HỮU ÍCH: Tập trung vào việc giải đáp thắc mắc một cách hữu ích nhất
3. LINH HOẠT: 
   - Câu hỏi ngắn → trả lời ngắn gọn, súc tích
   - Câu hỏi phức tạp → giải thích chi tiết, có ví dụ
   - Câu hỏi về tiếng Nhật → giải thích rõ ràng, kèm ví dụ tiếng Nhật (có cách đọc và nghĩa)
   - Câu hỏi khác → vẫn trả lời hữu ích, có thể gợi ý về tiếng Nhật nếu phù hợp
4. NGÔN NGỮ: Chủ yếu tiếng Việt, kèm tiếng Nhật khi cần (có cách đọc hiragana/romaji và nghĩa)
5. THÂN THIỆN: Luôn khuyến khích, động viên, và tạo cảm giác thoải mái

CÁCH TRẢ LỜI:
- Trả lời tự nhiên, không cần theo format cứng nhắc
- Có thể có hoặc không có các phần như "Lưu ý", "Bài tập" tùy vào ngữ cảnh
- Tập trung vào việc giúp học viên hiểu và học được điều gì đó
- Nếu không biết, thành thật nói và đề xuất cách tìm hiểu thêm`;

    // 3. Gọi Gemini với system instruction và conversation history
    let botText;
    try {
      botText = await callGemini(systemPrompt, content, existingHistory);
    } catch (apiErr) {
      console.error("Gemini API Error:", apiErr);
      botText =
        "⚠️ Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi của bạn. Vui lòng thử lại sau hoặc hỏi câu hỏi khác.";
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