import { prisma } from "../prisma.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { generateAudioFromText, generateAndUpdateAudio } from "../services/tts.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || "http://localhost:4000";

function resolveAudioUrl(audioUrl) {
  if (!audioUrl) return null;
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://"))
    return audioUrl;
  const base = BASE_URL.replace(/\/$/, "");
  const p = audioUrl.startsWith("/") ? audioUrl : `/${audioUrl}`;
  return base + p;
}

// GET /api/listening?level=N5
export const getListeningByLevel = async (req, res, next) => {
  try {
    const { level } = req.query;

    if (!level) {
      return res.status(400).json({
        message: "Thiếu tham số level (N5, N4, N3, N2, N1)",
      });
    }

    // Get listening sets for the level
    const sets = await prisma.listening_sets.findMany({
      where: {
        jlpt_level: level,
        is_published: true,
      },
      include: {
        items: {
          orderBy: { item_id: "asc" },
        },
      },
      orderBy: { set_id: "asc" },
    });

    // Flatten items from all sets into exercises
    const exercises = [];
    sets.forEach((set) => {
      set.items.forEach((item) => {
        let options = [];
        try {
          options = JSON.parse(item.options_json);
        } catch (e) {
          console.error("Error parsing options_json:", e);
          options = [];
        }

        exercises.push({
          id: item.item_id,
          set_id: set.set_id,
          set_title: set.title,
          jlpt_level: set.jlpt_level,
          audioUrl: resolveAudioUrl(item.audio_url),
          question: item.question,
          options: options,
        });
      });
    });

    return res.json({ exercises });
  } catch (err) {
    next(err);
  }
};

// GET /api/listening/review?level=N5
// Trả về danh sách bài cần ôn tập hôm nay cho user (new + learning)
export const getListeningReview = async (req, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Cần đăng nhập để lấy danh sách ôn tập" });
    }

    const { level } = req.query;
    if (!level) {
      return res
        .status(400)
        .json({ message: "Thiếu tham số level (N5, N4, N3, N2, N1)" });
    }

    const sets = await prisma.listening_sets.findMany({
      where: { jlpt_level: level, is_published: true },
      include: {
        items: {
          orderBy: { item_id: "asc" },
        },
      },
      orderBy: { set_id: "asc" },
    });

    const allItems = [];
    sets.forEach((set) => {
      set.items.forEach((item) => {
        let options = [];
        try {
          options = JSON.parse(item.options_json);
        } catch (e) {
          console.error("Error parsing options_json:", e);
          options = [];
        }

        allItems.push({
          id: item.item_id,
          set_id: set.set_id,
          set_title: set.title,
          jlpt_level: set.jlpt_level,
          audioUrl: resolveAudioUrl(item.audio_url),
          question: item.question,
          options,
        });
      });
    });

    if (allItems.length === 0) {
      return res.json({ newItems: [], learningItems: [] });
    }

    const itemIds = allItems.map((i) => i.id);

    const attempts = await prisma.listening_attempts.findMany({
      where: {
        user_id: req.user.user_id,
        item_id: { in: itemIds },
      },
      orderBy: { created_at: "asc" },
    });

    const progressByItem = {};
    for (const a of attempts) {
      if (!progressByItem[a.item_id]) {
        progressByItem[a.item_id] = {
          attempted: false,
          lastCorrect: false,
          wrongCount: 0,
        };
      }
      progressByItem[a.item_id].attempted = true;
      progressByItem[a.item_id].lastCorrect = a.is_correct;
      if (!a.is_correct) {
        progressByItem[a.item_id].wrongCount += 1;
      }
    }

    const newItems = [];
    const learningItems = [];

    allItems.forEach((item) => {
      const p = progressByItem[item.id];
      if (!p) {
        newItems.push(item);
      } else if (!p.lastCorrect) {
        learningItems.push({
          ...item,
          wrongCount: p.wrongCount,
        });
      }
    });

    learningItems.sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0));

    return res.json({
      newItems: newItems.slice(0, 3),
      learningItems: learningItems.slice(0, 5),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/listening/:id
export const getListeningDetail = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "exerciseId không hợp lệ" });
    }

    const item = await prisma.listening_items.findUnique({
      where: { item_id: id },
      include: {
        set: {
          select: {
            set_id: true,
            jlpt_level: true,
            title: true,
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy bài tập luyện nghe" });
    }

    // Parse options from JSON
    let options = [];
    try {
      options = JSON.parse(item.options_json);
    } catch (e) {
      console.error("Error parsing options_json:", e);
      options = [];
    }

    // Get correct answer from options array using correct_index
    const correctAnswer = options[item.correct_index] || "";

    // Format response
    const formattedExercise = {
      id: item.item_id,
      set_id: item.set.set_id,
      set_title: item.set.title,
      jlpt_level: item.set.jlpt_level,
      audioUrl: resolveAudioUrl(item.audio_url),
      transcript: item.transcript_jp || "",
      translation: item.explain_viet || "",
      question: item.question,
      options: options,
      correctAnswer: correctAnswer,
    };

    return res.json(formattedExercise);
  } catch (err) {
    next(err);
  }
};

// POST /api/listening/upload
export const uploadAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file được upload" });
    }

    // Tạo URL để truy cập file
    const baseUrl = process.env.BASE_URL || "http://localhost:4000";
    const fileUrl = `${baseUrl}/uploads/audio/${req.file.filename}`;

    return res.json({
      message: "Upload audio thành công",
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: fileUrl,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/listening/audio/:filename
export const deleteAudio = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "../../uploads/audio", filename);

    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File không tồn tại" });
    }

    // Xóa file
    fs.unlinkSync(filePath);

    return res.json({ message: "Xóa file thành công" });
  } catch (err) {
    next(err);
  }
};

// POST /api/listening/generate-audio
// Generate audio từ transcript sử dụng TTS
export const generateAudio = async (req, res, next) => {
  try {
    const { text, itemId, options } = req.body;

    if (!text) {
      return res.status(400).json({ message: "Thiếu tham số text (transcript)" });
    }

    let result;

    // Nếu có itemId, generate và cập nhật vào database
    if (itemId) {
      result = await generateAndUpdateAudio(itemId, text);
      return res.json({
        message: "Generate audio và cập nhật database thành công",
        audioUrl: result.audioUrl,
      });
    } else {
      // Chỉ generate audio, không cập nhật database
      result = await generateAudioFromText(text, null, options);
      return res.json({
        message: "Generate audio thành công",
        filename: result.filename,
        url: result.url,
        size: result.size,
      });
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/listening/generate-audio-batch
// Generate audio cho nhiều items cùng lúc
export const generateAudioBatch = async (req, res, next) => {
  try {
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ 
        message: "Thiếu tham số itemIds (array of item IDs)" 
      });
    }

    const results = [];
    const errors = [];

    for (const itemId of itemIds) {
      try {
        // Lấy transcript từ database
        const item = await prisma.listening_items.findUnique({
          where: { item_id: itemId },
          select: { transcript_jp: true },
        });

        if (!item) {
          errors.push({ itemId, error: "Item không tồn tại" });
          continue;
        }

        if (!item.transcript_jp) {
          errors.push({ itemId, error: "Item không có transcript" });
          continue;
        }

        // Generate audio
        const result = await generateAndUpdateAudio(itemId, item.transcript_jp);
        results.push({ itemId, audioUrl: result.audioUrl });
      } catch (error) {
        errors.push({ itemId, error: error.message });
      }
    }

    return res.json({
      message: `Generate audio hoàn tất: ${results.length} thành công, ${errors.length} lỗi`,
      results,
      errors,
    });
  } catch (err) {
    next(err);
  }
};

const MAX_RETRIES = 3;

// POST /api/listening/attempt - Ghi nhận lần làm bài (đúng/sai). Cần đăng nhập.
export const recordAttempt = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Cần đăng nhập để lưu tiến độ" });
    }
    const { itemId, isCorrect } = req.body;
    if (itemId == null || typeof isCorrect !== "boolean") {
      return res.status(400).json({ message: "Thiếu itemId hoặc isCorrect" });
    }
    const item = await prisma.listening_items.findUnique({
      where: { item_id: Number(itemId) },
    });
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }
    await prisma.listening_attempts.create({
      data: {
        user_id: req.user.user_id,
        item_id: item.item_id,
        is_correct: isCorrect,
      },
    });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// GET /api/listening/progress?level=N5 - Tiến độ theo từng item (đã học, đúng/sai, số lần sai)
export const getProgress = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({ byItem: {} });
    }
    const { level } = req.query;
    if (!level) {
      return res.status(400).json({ message: "Thiếu tham số level" });
    }
    const sets = await prisma.listening_sets.findMany({
      where: { jlpt_level: level, is_published: true },
      include: { items: { select: { item_id: true } } },
    });
    const itemIds = sets.flatMap((s) => s.items.map((i) => i.item_id));
    if (itemIds.length === 0) {
      return res.json({ byItem: {} });
    }
    const attempts = await prisma.listening_attempts.findMany({
      where: {
        user_id: req.user.user_id,
        item_id: { in: itemIds },
      },
      orderBy: { created_at: "asc" },
    });
    const byItem = {};
    for (const a of attempts) {
      if (!byItem[a.item_id]) {
        byItem[a.item_id] = { attempted: false, lastCorrect: false, wrongCount: 0 };
      }
      byItem[a.item_id].attempted = true;
      byItem[a.item_id].lastCorrect = a.is_correct;
      if (!a.is_correct) byItem[a.item_id].wrongCount += 1;
    }
    return res.json({ byItem });
  } catch (err) {
    next(err);
  }
};
