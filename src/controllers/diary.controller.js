import { PrismaClient } from "@prisma/client";
import { compactTitle } from "../services/diary.util.js";
import { correctJapanese, checkGrammar } from "../services/nlp.services.js";

const prisma = new PrismaClient();

function pickUserId(req) {
  return req.user?.user_id || null;
}

// ✅ Tạo nhật ký
export const createDiary = async (req, res, next) => {
  try {
    const userId = pickUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Safely extract FormData fields (multer puts text fields in req.body)
    const title = req.body?.title || "";
    const content_jp = req.body?.content_jp || "";
    
    // content_jp is required in schema, ensure it's not empty
    if (!content_jp || typeof content_jp !== "string") {
      return res.status(400).json({ message: "content_jp is required" });
    }
    
    // Handle multiple images
    let imagesArray = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      imagesArray = req.files.map(f => `/uploads/diary_images/${f.filename}`);
    }
    const imagesJson = imagesArray.length > 0 ? JSON.stringify(imagesArray) : null;
    
    // Keep first image as image_url for backward compatibility
    const firstImage = imagesArray.length > 0 ? imagesArray[0] : null;

    // Call NLP service with error handling
    let nlp;
    try {
      nlp = await correctJapanese(content_jp);
    } catch (nlpError) {
      console.error("Error in correctJapanese:", nlpError);
      // Fallback: use original content if NLP fails
      nlp = { corrected: content_jp, notes: [], furigana: [] };
    }

    // Ensure corrected content is not empty
    const finalContent = (nlp.corrected && nlp.corrected.trim()) || content_jp || "";

    const row = await prisma.diaryentries.create({
      data: {
        user_id: userId,
        title: title.trim() || "",
        content_jp: finalContent,
        image_url: firstImage,
        images: imagesJson,
        nlp_analysis: JSON.stringify(nlp),
      },
    });

    res.status(201).json(serialize(row));
  } catch (err) {
    console.error("Error in createDiary:", err);
    next(err);
  }
};

// ✅ Lấy danh sách nhật ký (mới → cũ)
export const listDiaries = async (req, res, next) => {
  try {
    const userId = pickUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const month = req.query.month ? parseInt(req.query.month) : null;
    const year = req.query.year ? parseInt(req.query.year) : null;

    let where = { user_id: userId };
    if (year && month) {
      where.created_at = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    }

    const rows = await prisma.diaryentries.findMany({
      where,
      orderBy: { created_at: "desc" },
    });

    res.json(rows.map(serialize));
  } catch (err) {
    next(err);
  }
};

// ✅ Lấy chi tiết 1 bài
export const getDiary = async (req, res, next) => {
  try {
    const userId = pickUserId(req);
    const id = parseInt(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid diary ID" });
    }

    const row = await prisma.diaryentries.findFirst({
      where: { diary_id: id, user_id: userId },
    });

    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(serialize(row));
  } catch (err) {
    next(err);
  }
};

export const updateDiary = async (req, res, next) => {
  try {
    const userId = pickUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid diary ID" });
    }

    const existed = await prisma.diaryentries.findFirst({
      where: { diary_id: id, user_id: userId },
    });
    if (!existed) return res.status(404).json({ message: "Diary not found" });

    // Handle multiple images
    // Start with existing images
    let imagesArray = [];
    try {
      if (existed.images) {
        imagesArray = JSON.parse(existed.images);
        if (!Array.isArray(imagesArray)) imagesArray = [];
      }
    } catch (e) {
      console.warn("Error parsing existing images:", e);
      imagesArray = [];
    }
    
    // If existing images are passed as JSON string in body (when updating)
    if (req.body?.existing_images) {
      try {
        const parsed = typeof req.body.existing_images === 'string' 
          ? JSON.parse(req.body.existing_images) 
          : req.body.existing_images;
        if (Array.isArray(parsed)) {
          imagesArray = parsed;
        }
      } catch (e) {
        console.warn("Error parsing existing_images from body:", e);
        // Keep existing imagesArray if parse fails
      }
    }
    
    // Add new uploaded files
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const newImages = req.files.map(f => `/uploads/diary_images/${f.filename}`);
      imagesArray = [...imagesArray, ...newImages];
    }
    
    const imagesJson = imagesArray.length > 0 ? JSON.stringify(imagesArray) : null;
    const firstImage = imagesArray.length > 0 ? imagesArray[0] : null;

    // Handle content_jp update
    let finalContent = existed.content_jp;
    let nlp = null;
    
    if (req.body?.content_jp !== undefined && typeof req.body.content_jp === "string") {
      const newContent = req.body.content_jp.trim();
      // Only update if content actually changed
      if (newContent !== existed.content_jp) {
        try {
          nlp = await correctJapanese(newContent);
          finalContent = (nlp.corrected && nlp.corrected.trim()) || newContent || existed.content_jp;
        } catch (nlpError) {
          console.error("Error in correctJapanese during update:", nlpError);
          // Fallback: use the new content if NLP fails
          finalContent = newContent || existed.content_jp;
          nlp = { corrected: newContent, notes: [], furigana: [] };
        }
      }
    }

    // Ensure content_jp is not empty (required field)
    if (!finalContent || finalContent.trim().length === 0) {
      finalContent = existed.content_jp; // Keep existing if new content is empty
    }

    const updated = await prisma.diaryentries.update({
      where: { diary_id: id },
      data: {
        title: req.body?.title !== undefined ? (req.body.title?.trim() || "") : existed.title,
        content_jp: finalContent,
        image_url: firstImage ?? existed.image_url,
        images: imagesJson ?? existed.images,
        nlp_analysis: nlp ? JSON.stringify(nlp) : existed.nlp_analysis,
      },
    });

    return res.json(serialize(updated));
  } catch (error) {
    console.error("Error in updateDiary:", error);
    next(error);
  }
};

export const deleteDiary = async (req, res, next) => {
  try {
    const userId = pickUserId(req);
    const id = parseInt(req.params.id, 10);

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid diary ID" });
    }

    if (!id) return res.status(400).json({ message: "Invalid diary ID" });

    const existed = await prisma.diaryentries.findFirst({
      where: { diary_id: id, user_id: userId },
    });
    if (!existed) return res.status(404).json({ message: "Diary not found" });

    await prisma.diaryentries.delete({ where: { diary_id: id } });

    return res.json({ message: "Diary deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// ✅ Kiểm tra ngữ pháp
export const checkGrammarDiary = async (req, res, next) => {
  try {
    const userId = pickUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { text } = req.body;
    
    if (!text || typeof text !== "string") {
      return res.status(400).json({ message: "Text is required" });
    }

    console.log("checkGrammarDiary called with text:", text.substring(0, 100));

    const { errors, furigana } = await checkGrammar(text);
    
    console.log("checkGrammarDiary returning:", {
      errorsCount: errors.length,
      furiganaCount: furigana.length,
    });

    res.json({ errors, furigana });
  } catch (err) {
    console.error("Error in checkGrammarDiary:", err);
    console.error("Error stack:", err.stack);
    next(err);
  }
};

function serialize(row) {
  return {
    id: row.diary_id,
    user_id: row.user_id,
    title: row.title,
    title_compact: compactTitle(row.title || ""),
    content_jp: row.content_jp,
    image_url: row.image_url,
    images: row.images ? JSON.parse(row.images) : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    nlp_analysis: row.nlp_analysis ? JSON.parse(row.nlp_analysis) : null,
  };
}
