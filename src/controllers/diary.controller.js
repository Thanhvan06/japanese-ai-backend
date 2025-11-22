import { PrismaClient } from "@prisma/client";
import { compactTitle } from "../services/diary.util.js";
import { correctJapanese } from "../services/nlp.services.js";

const prisma = new PrismaClient();

function pickUserId(req) {
  return req.user?.user_id || null;
}

// ✅ Tạo nhật ký
export const createDiary = async (req, res, next) => {
  try {
    const userId = pickUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { title, content_jp } = req.body;
    const coverImg = req.file ? `/uploads/diary_covers/${req.file.filename}` : null;

    const nlp = await correctJapanese(content_jp);

    const row = await prisma.diaryentries.create({
      data: {
        user_id: userId,
        title: title?.trim() || "",
        content_jp: nlp.corrected || content_jp || "",
        image_url: coverImg,
        nlp_analysis: JSON.stringify(nlp),
      },
    });

    res.status(201).json(serialize(row));
  } catch (err) {
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

    // If new image is uploaded
    const newCover = req.file ? `/uploads/diary_covers/${req.file.filename}` : null;

    let nlp = null;
    if (typeof req.body.content_jp === "string") {
      nlp = await correctJapanese(req.body.content_jp);
    }

    const updated = await prisma.diaryentries.update({
      where: { diary_id: id },
      data: {
        title: req.body.title ? req.body.title.trim() : existed.title,
        content_jp: nlp ? nlp.corrected : existed.content_jp,
        image_url: newCover ?? existed.image_url,
        nlp_analysis: nlp ? JSON.stringify(nlp) : existed.nlp_analysis,
      },
    });

    return res.json(serialize(updated));
  } catch (error) {
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

function serialize(row) {
  return {
    id: row.diary_id,
    user_id: row.user_id,
    title: row.title,
    title_compact: compactTitle(row.title || ""),
    content_jp: row.content_jp,
    image_url: row.image_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    nlp_analysis: row.nlp_analysis ? JSON.parse(row.nlp_analysis) : null,
  };
}
