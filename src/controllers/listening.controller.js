import { prisma } from "../prisma.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { generateAudioFromText, generateAndUpdateAudio } from "../services/tts.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        listening_items: {
          orderBy: { item_id: "asc" },
        },
      },
      orderBy: { set_id: "asc" },
    });

    // Flatten items from all sets into exercises
    const exercises = [];
    sets.forEach((set) => {
      set.listening_items.forEach((item) => {
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
          audioUrl: item.audio_url,
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
        listening_sets: {
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
      set_id: item.listening_sets.set_id,
      set_title: item.listening_sets.title,
      jlpt_level: item.listening_sets.jlpt_level,
      audioUrl: item.audio_url,
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
