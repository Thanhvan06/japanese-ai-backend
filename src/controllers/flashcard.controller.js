import { z } from "zod";
import { prisma } from "../prisma.js";

// ----- Validation Schemas -----
const createFolderSchema = z.object({
  folderName: z.string().min(1, "Tên folder không được để trống").max(255)
});

const createSetSchema = z.object({
  setName: z.string().min(1, "Tên set không được để trống").max(255),
  folderId: z.union([z.number().int().positive(), z.null()]).optional()
});

const createCardSchema = z.object({
  sideJp: z.string().min(1, "Mặt tiếng Nhật không được để trống"),
  sideViet: z.string().min(1, "Mặt tiếng Việt không được để trống"),
  imageUrl: z.string().url().optional().or(z.literal("")).nullable()
});

const updateCardSchema = createCardSchema.partial();

const studyAnswerSchema = z.object({
  cardId: z.number().int().positive(),
  correct: z.boolean()
});

// ----- Folder Controllers -----

// Lấy tất cả folders của user
export const getFolders = async (req, res, next) => {
  try {
    const folders = await prisma.fcfolders.findMany({
      where: { user_id: req.user.user_id },
      include: {
        fcsets: {
          select: {
            set_id: true,
            set_name: true,
            times_practiced: true,
            created_at: true,
            _count: {
              select: { fccards: true }
            }
          }
        }
      },
      orderBy: { folder_id: "desc" }
    });

    res.json({ folders });
  } catch (err) {
    next(err);
  }
};

// Tạo folder mới
export const createFolder = async (req, res, next) => {
  try {
    const data = createFolderSchema.parse(req.body);

    const folder = await prisma.fcfolders.create({
      data: {
        user_id: req.user.user_id,
        folder_name: data.folderName
      }
    });

    res.status(201).json({ folder });
  } catch (err) {
    next(err);
  }
};

// Xóa folder
export const deleteFolder = async (req, res, next) => {
  try {
    const folderId = parseInt(req.params.folderId);

    // Kiểm tra folder thuộc về user
    const folder = await prisma.fcfolders.findUnique({
      where: { folder_id: folderId }
    });

    if (!folder) {
      return res.status(404).json({ message: "Không tìm thấy folder" });
    }

    if (folder.user_id !== req.user.user_id) {
      return res.status(403).json({ message: "Không có quyền xóa folder này" });
    }

    await prisma.fcfolders.delete({
      where: { folder_id: folderId }
    });

    res.json({ message: "Xóa folder thành công" });
  } catch (err) {
    next(err);
  }
};

// ----- Set Controllers -----

// Lấy tất cả sets của user (có thể lọc theo folder)
export const getSets = async (req, res, next) => {
  try {
    const folderId = req.query.folderId ? parseInt(req.query.folderId) : null;

    const where = {
      user_id: req.user.user_id,
      ...(folderId !== null && { folder_id: folderId })
    };

    const sets = await prisma.fcsets.findMany({
      where,
      include: {
        fccards: {
          select: {
            card_id: true,
            mastery_level: true
          }
        },
        fcfolders: {
          select: {
            folder_id: true,
            folder_name: true
          }
        }
      },
      orderBy: { created_at: "desc" }
    });

    const setsWithCount = sets.map(set => ({
      ...set,
      card_count: set.fccards.length,
      fccards: undefined // Ẩn chi tiết cards
    }));

    res.json({ sets: setsWithCount });
  } catch (err) {
    next(err);
  }
};

// Lấy chi tiết một set
export const getSetById = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);

    const set = await prisma.fcsets.findFirst({
      where: {
        set_id: setId,
        user_id: req.user.user_id
      },
      include: {
        fccards: {
          orderBy: { card_id: "asc" }
        },
        fcfolders: {
          select: {
            folder_id: true,
            folder_name: true
          }
        }
      }
    });

    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    res.json({ set });
  } catch (err) {
    next(err);
  }
};

// Tạo set mới
export const createSet = async (req, res, next) => {
  try {
    const data = createSetSchema.parse(req.body);

    // Nếu có folder_id, kiểm tra folder thuộc về user
    if (data.folderId) {
      const folder = await prisma.fcfolders.findUnique({
        where: { folder_id: data.folderId }
      });

      if (!folder || folder.user_id !== req.user.user_id) {
        return res.status(404).json({ message: "Không tìm thấy folder" });
      }
    }

    const set = await prisma.fcsets.create({
      data: {
        user_id: req.user.user_id,
        set_name: data.setName,
        folder_id: data.folderId || null
      }
    });

    res.status(201).json({ set });
  } catch (err) {
    next(err);
  }
};

// Cập nhật set
export const updateSet = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);
    const data = createSetSchema.partial().parse(req.body);

    // Kiểm tra set thuộc về user
    const set = await prisma.fcsets.findFirst({
      where: {
        set_id: setId,
        user_id: req.user.user_id
      }
    });

    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    // Nếu cập nhật folder_id, kiểm tra folder
    if (data.folderId !== undefined && data.folderId !== null) {
      const folder = await prisma.fcfolders.findUnique({
        where: { folder_id: data.folderId }
      });

      if (!folder || folder.user_id !== req.user.user_id) {
        return res.status(404).json({ message: "Không tìm thấy folder" });
      }
    }

    const updatedSet = await prisma.fcsets.update({
      where: { set_id: setId },
      data: {
        set_name: data.setName,
        folder_id: data.folderId !== undefined ? data.folderId : set.folder_id
      }
    });

    res.json({ set: updatedSet });
  } catch (err) {
    next(err);
  }
};

// Xóa set
export const deleteSet = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);

    const set = await prisma.fcsets.findFirst({
      where: {
        set_id: setId,
        user_id: req.user.user_id
      }
    });

    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    await prisma.fcsets.delete({
      where: { set_id: setId }
    });

    res.json({ message: "Xóa set thành công" });
  } catch (err) {
    next(err);
  }
};

// ----- Card Controllers -----

// Lấy tất cả cards trong một set
export const getCards = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);

    // Kiểm tra set thuộc về user
    const set = await prisma.fcsets.findFirst({
      where: {
        set_id: setId,
        user_id: req.user.user_id
      }
    });

    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    const cards = await prisma.fccards.findMany({
      where: { set_id: setId },
      orderBy: { card_id: "asc" }
    });

    res.json({ cards });
  } catch (err) {
    next(err);
  }
};

// Tạo card mới
export const createCard = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);
    const data = createCardSchema.parse(req.body);

    // Kiểm tra set thuộc về user
    const set = await prisma.fcsets.findFirst({
      where: {
        set_id: setId,
        user_id: req.user.user_id
      }
    });

    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    const card = await prisma.fccards.create({
      data: {
        set_id: setId,
        side_jp: data.sideJp,
        side_viet: data.sideViet,
        image_url: data.imageUrl || null,
        mastery_level: 1
      }
    });

    res.status(201).json({ card });
  } catch (err) {
    next(err);
  }
};

// Cập nhật card
export const updateCard = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);
    const cardId = parseInt(req.params.cardId);
    const data = updateCardSchema.parse(req.body);

    // Kiểm tra set thuộc về user
    const set = await prisma.fcsets.findFirst({
      where: {
        set_id: setId,
        user_id: req.user.user_id
      }
    });

    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    // Kiểm tra card thuộc về set
    const card = await prisma.fccards.findFirst({
      where: {
        card_id: cardId,
        set_id: setId
      }
    });

    if (!card) {
      return res.status(404).json({ message: "Không tìm thấy card" });
    }

    const updatedCard = await prisma.fccards.update({
      where: { card_id: cardId },
      data: {
        side_jp: data.sideJp !== undefined ? data.sideJp : card.side_jp,
        side_viet: data.sideViet !== undefined ? data.sideViet : card.side_viet,
        image_url: data.imageUrl !== undefined ? data.imageUrl : card.image_url
      }
    });

    res.json({ card: updatedCard });
  } catch (err) {
    next(err);
  }
};

// Xóa card
export const deleteCard = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);
    const cardId = parseInt(req.params.cardId);

    // Kiểm tra set thuộc về user
    const set = await prisma.fcsets.findFirst({
      where: {
        set_id: setId,
        user_id: req.user.user_id
      }
    });

    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    // Kiểm tra card thuộc về set
    const card = await prisma.fccards.findFirst({
      where: {
        card_id: cardId,
        set_id: setId
      }
    });

    if (!card) {
      return res.status(404).json({ message: "Không tìm thấy card" });
    }

    await prisma.fccards.delete({
      where: { card_id: cardId }
    });

    res.json({ message: "Xóa card thành công" });
  } catch (err) {
    next(err);
  }
};

// ----- Study Controllers (Giống Quizlet) -----

// Bắt đầu học (lấy danh sách cards để học)
export const startStudy = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);
    const mode = req.query.mode || "all"; // all, not-mastered, mastered

    // Kiểm tra set thuộc về user
    const set = await prisma.fcsets.findFirst({
      where: {
        set_id: setId,
        user_id: req.user.user_id
      }
    });

    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    // Lấy cards dựa trên mode
    let whereClause = { set_id: setId };

    if (mode === "not-mastered") {
      whereClause.mastery_level = { lt: 5 }; // Chưa thành thạo (1-4)
    } else if (mode === "mastered") {
      whereClause.mastery_level = { gte: 5 }; // Đã thành thạo (5)
    }
    // mode === "all" thì lấy tất cả

    const cards = await prisma.fccards.findMany({
      where: whereClause,
      orderBy: { card_id: "asc" }
    });

    if (cards.length === 0) {
      return res.status(404).json({ message: "Không có card nào để học" });
    }

    // Cập nhật times_practiced
    await prisma.fcsets.update({
      where: { set_id: setId },
      data: {
        times_practiced: { increment: 1 }
      }
    });

    // Trả về cards (chỉ mặt trước để học)
    const studyCards = cards.map(card => ({
      card_id: card.card_id,
      front: card.side_jp, // Mặt trước là tiếng Nhật
      image_url: card.image_url,
      mastery_level: card.mastery_level
    }));

    res.json({
      set_id: setId,
      set_name: set.set_name,
      total_cards: cards.length,
      cards: studyCards
    });
  } catch (err) {
    next(err);
  }
};

// Lấy câu trả lời của một card
export const getCardAnswer = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);
    const cardId = parseInt(req.params.cardId);

    // Kiểm tra set thuộc về user
    const set = await prisma.fcsets.findFirst({
      where: {
        set_id: setId,
        user_id: req.user.user_id
      }
    });

    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    const card = await prisma.fccards.findFirst({
      where: {
        card_id: cardId,
        set_id: setId
      }
    });

    if (!card) {
      return res.status(404).json({ message: "Không tìm thấy card" });
    }

    res.json({
      card_id: card.card_id,
      front: card.side_jp,
      back: card.side_viet,
      image_url: card.image_url
    });
  } catch (err) {
    next(err);
  }
};

// Nộp kết quả học (đúng/sai)
export const submitStudyAnswer = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);
    const data = studyAnswerSchema.parse(req.body);

    // Kiểm tra set thuộc về user
    const set = await prisma.fcsets.findFirst({
      where: {
        set_id: setId,
        user_id: req.user.user_id
      }
    });

    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    // Kiểm tra card thuộc về set
    const card = await prisma.fccards.findFirst({
      where: {
        card_id: data.cardId,
        set_id: setId
      }
    });

    if (!card) {
      return res.status(404).json({ message: "Không tìm thấy card" });
    }

    // Cập nhật mastery_level
    // Nếu đúng: tăng level (max 5)
    // Nếu sai: giảm level (min 1)
    let newLevel = card.mastery_level;
    if (data.correct) {
      newLevel = Math.min(card.mastery_level + 1, 5);
    } else {
      newLevel = Math.max(card.mastery_level - 1, 1);
    }

    const updatedCard = await prisma.fccards.update({
      where: { card_id: data.cardId },
      data: { mastery_level: newLevel }
    });

    res.json({
      card_id: updatedCard.card_id,
      mastery_level: updatedCard.mastery_level,
      message: data.correct ? "Chúc mừng! Bạn đã trả lời đúng" : "Chưa đúng, cố gắng lần sau nhé!"
    });
  } catch (err) {
    next(err);
  }
};

// Lấy thống kê học tập
export const getStudyStats = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);

    // Kiểm tra set thuộc về user
    const set = await prisma.fcsets.findFirst({
      where: {
        set_id: setId,
        user_id: req.user.user_id
      },
      include: {
        fccards: true
      }
    });

    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    const totalCards = set.fccards.length;
    const masteredCards = set.fccards.filter(c => c.mastery_level >= 5).length;
    const learningCards = set.fccards.filter(c => c.mastery_level >= 2 && c.mastery_level < 5).length;
    const newCards = set.fccards.filter(c => c.mastery_level === 1).length;

    const avgMastery = totalCards > 0
      ? set.fccards.reduce((sum, c) => sum + c.mastery_level, 0) / totalCards
      : 0;

    res.json({
      set_id: setId,
      set_name: set.set_name,
      times_practiced: set.times_practiced,
      total_cards: totalCards,
      mastered_cards: masteredCards,
      learning_cards: learningCards,
      new_cards: newCards,
      average_mastery: Math.round(avgMastery * 10) / 10,
      mastery_percentage: totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0
    });
  } catch (err) {
    next(err);
  }
};

