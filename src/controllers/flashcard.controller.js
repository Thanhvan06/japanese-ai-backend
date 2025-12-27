import { z } from "zod";
import { prisma } from "../prisma.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  imageUrl: z.string().optional().or(z.literal("")).nullable()
});

const updateCardSchema = createCardSchema.partial();

const studyAnswerSchema = z.object({
  cardId: z.number().int().positive(),
  correct: z.boolean()
});

const completeRoundSchema = z.object({
  answers: z.array(
    z.object({
      cardId: z.number().int().positive(),
      correct: z.boolean()
    })
  ).min(1, "Cần ít nhất 1 câu trả lời"),
  durationSeconds: z.number().int().nonnegative().optional()
});

function normalizePlaylistConfig(raw) {
  if (Array.isArray(raw)) {
    return { playlist: raw, flashcard_rounds: {} };
  }
  return {
    playlist: raw?.playlist ?? [],
    flashcard_rounds: raw?.flashcard_rounds ?? {},
  };
}

async function getOrCreateUserSettings(userId) {
  let settings = await prisma.user_settings.findUnique({ where: { user_id: userId } });
  if (!settings) {
    settings = await prisma.user_settings.create({
      data: {
        user_id: userId,
        theme_config: {},
        todo_config: {},
        playlist_config: { playlist: [], flashcard_rounds: {} },
      },
    });
  }
  return settings;
}

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

    // Get completion status for each set
    const setIds = sets.map(s => s.set_id);
    const completedSessions = await prisma.flashcard_sessions.findMany({
      where: {
        user_id: req.user.user_id,
        set_id: { in: setIds },
        completed_at: { not: null },
      },
      select: {
        set_id: true,
      },
      distinct: ["set_id"],
    });
    const completedSetIds = new Set(completedSessions.map(s => s.set_id));

    const setsWithCount = sets.map(set => {
      const hasCompletedRound = completedSetIds.has(set.set_id);
      const allCardsMastered = set.fccards.length > 0 && 
        set.fccards.every(card => (card.mastery_level || 1) >= 5);
      const isCompleted = hasCompletedRound || allCardsMastered;

      return {
        ...set,
        card_count: set.fccards.length,
        is_completed: isCompleted,
        fccards: undefined // Ẩn chi tiết cards
      };
    });

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

    // Get completion status
    const hasCompletedRound = await prisma.flashcard_sessions.findFirst({
      where: {
        user_id: req.user.user_id,
        set_id: setId,
        completed_at: { not: null },
      },
    });
    const allCardsMastered = set.fccards.length > 0 && 
      set.fccards.every(card => (card.mastery_level || 1) >= 5);
    const isCompleted = !!hasCompletedRound || allCardsMastered;

    res.json({ 
      set: {
        ...set,
        is_completed: isCompleted,
      }
    });
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
    
    let imageUrl = null;
    
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl && req.body.imageUrl.trim()) {
      imageUrl = req.body.imageUrl.trim();
    }
    
    const data = {
      sideJp: req.body.sideJp,
      sideViet: req.body.sideViet,
      imageUrl: imageUrl
    };
    
    const validated = createCardSchema.parse(data);

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
        side_jp: validated.sideJp,
        side_viet: validated.sideViet,
        image_url: validated.imageUrl || null,
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

    let imageUrl = undefined;
    
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl !== undefined) {
      if (req.body.imageUrl && req.body.imageUrl.trim()) {
        imageUrl = req.body.imageUrl.trim();
      } else {
        imageUrl = null;
      }
    }
    
    const updateData = {};
    if (req.body.sideJp !== undefined) updateData.sideJp = req.body.sideJp;
    if (req.body.sideViet !== undefined) updateData.sideViet = req.body.sideViet;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    
    const validated = updateCardSchema.parse(updateData);

    const updatedCard = await prisma.fccards.update({
      where: { card_id: cardId },
      data: {
        side_jp: validated.sideJp !== undefined ? validated.sideJp : card.side_jp,
        side_viet: validated.sideViet !== undefined ? validated.sideViet : card.side_viet,
        image_url: validated.imageUrl !== undefined ? validated.imageUrl : card.image_url
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

    // Check if all cards are remembered (mastery_level >= 5) after this update
    const allCards = await prisma.fccards.findMany({
      where: { set_id: setId }
    });

    const allRemembered = allCards.length > 0 && allCards.every(c => c.mastery_level >= 5);
    let completed = false;

    if (allRemembered) {
      // Mark set as completed by creating/updating flashcard_session
      const existingSession = await prisma.flashcard_sessions.findFirst({
        where: {
          user_id: req.user.user_id,
          set_id: setId,
          completed_at: { not: null }
        }
      });

      if (!existingSession) {
        // Create a completion session if none exists
        await prisma.flashcard_sessions.create({
          data: {
            user_id: req.user.user_id,
            set_id: setId,
            remembered_count: allCards.length,
            not_remembered_count: 0,
            completed_at: new Date()
          }
        });
      }
      completed = true;
    }

    res.json({
      card_id: updatedCard.card_id,
      mastery_level: updatedCard.mastery_level,
      completed: completed,
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

// ----- Create Flashcard Set from Vocab -----

const createSetFromVocabSchema = z.object({
  setName: z.string().min(1, "Tên set không được để trống").max(255),
  vocabIds: z.array(z.number().int().positive()).min(1, "Phải chọn ít nhất 1 từ vựng"),
  source: z.enum(["level", "topic"]).optional(),
  folderId: z.union([z.number().int().positive(), z.null()]).optional()
});

// Tạo flashcard set từ vocab selection
export const createSetFromVocab = async (req, res, next) => {
  try {
    const data = createSetFromVocabSchema.parse(req.body);

    // Lấy vocab items
    const vocabItems = await prisma.vocabitems.findMany({
      where: {
        vocab_id: { in: data.vocabIds },
        is_published: true
      }
    });

    if (vocabItems.length === 0) {
      return res.status(400).json({ message: "Không tìm thấy từ vựng hợp lệ" });
    }

    // Kiểm tra folder nếu có
    if (data.folderId) {
      const folder = await prisma.fcfolders.findUnique({
        where: { folder_id: data.folderId }
      });

      if (!folder || folder.user_id !== req.user.user_id) {
        return res.status(404).json({ message: "Không tìm thấy folder" });
      }
    }

    // Tạo set
    const set = await prisma.fcsets.create({
      data: {
        user_id: req.user.user_id,
        set_name: data.setName,
        folder_id: data.folderId || null
      }
    });

    // Tạo cards từ vocab items
    const cards = await Promise.all(
      vocabItems.map((vocab) =>
        prisma.fccards.create({
          data: {
            set_id: set.set_id,
            side_jp: vocab.word,
            side_viet: vocab.meaning,
            image_url: vocab.image_url || null,
            mastery_level: 1
          }
        })
      )
    );

    res.status(201).json({
      set: {
        ...set,
        vocab_ids: data.vocabIds,
        source: data.source || null,
        card_count: cards.length
      },
      message: `Tạo flashcard set thành công với ${cards.length} thẻ`
    });
  } catch (err) {
    next(err);
  }
};


// ----- Study Round (per round only) -----
async function persistRoundState(userId, setId, payload) {
  const settings = await getOrCreateUserSettings(userId);
  const playlistConfig = normalizePlaylistConfig(settings.playlist_config);
  const flashcardRounds = playlistConfig.flashcard_rounds ?? {};
  flashcardRounds[setId] = payload;

  await prisma.user_settings.update({
    where: { user_id: userId },
    data: {
      playlist_config: {
        playlist: playlistConfig.playlist ?? [],
        flashcard_rounds: flashcardRounds,
      },
    },
  });
}

export const completeStudyRound = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);
    const body = completeRoundSchema.parse(req.body);
    const userId = req.user.user_id;

    const set = await prisma.fcsets.findFirst({
      where: { set_id: setId, user_id: userId },
      include: { fccards: true },
    });
    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    const cardIds = set.fccards.map((c) => c.card_id);
    const uniqueAnswerIds = new Set(body.answers.map((a) => a.cardId));
    const missingCards = cardIds.filter((id) => !uniqueAnswerIds.has(id));
    if (missingCards.length > 0) {
      return res.status(400).json({ message: "Phải gửi kết quả cho toàn bộ thẻ trong set" });
    }

    const cardLookup = new Set(cardIds);
    let rememberedCount = 0;
    let notRememberedCount = 0;
    const rememberedList = [];
    const notRememberedList = [];

    body.answers.forEach((ans) => {
      if (!cardLookup.has(ans.cardId)) {
        return;
      }
      if (ans.correct) {
        rememberedCount += 1;
        rememberedList.push(ans.cardId);
      } else {
        notRememberedCount += 1;
        notRememberedList.push(ans.cardId);
      }
    });

    const totalCards = cardIds.length;
    notRememberedCount = Math.max(notRememberedCount, totalCards - rememberedCount);

    const flashSession = await prisma.flashcard_sessions.create({
      data: {
        user_id: userId,
        set_id: setId,
        remembered_count: rememberedCount,
        not_remembered_count: notRememberedCount,
      },
    });

    if (body.durationSeconds !== undefined) {
      const now = new Date();
      const start = new Date(now.getTime() - body.durationSeconds * 1000);
      await prisma.study_sessions.create({
        data: {
          user_id: userId,
          source: "flashcard",
          source_id: setId,
          start_time: start,
          end_time: now,
          duration_seconds: body.durationSeconds,
        },
      });
    }

    await persistRoundState(userId, setId, {
      round_id: flashSession.session_id,
      completed_at: flashSession.completed_at ?? new Date(),
      total_cards: totalCards,
      remembered_count: rememberedCount,
      not_remembered_count: notRememberedCount,
      tabs: {
        all: cardIds,
        remembered: rememberedList,
        not_remembered: notRememberedList.length > 0 ? notRememberedList : cardIds.filter((id) => !rememberedList.includes(id)),
      },
    });

    res.status(201).json({
      round: {
        round_id: flashSession.session_id,
        set_id: setId,
        total_cards: totalCards,
        remembered_count: rememberedCount,
        not_remembered_count: notRememberedCount,
        completed_at: flashSession.completed_at,
      },
      chart: {
        slices: {
          remembered: rememberedCount,
          not_remembered: notRememberedCount,
        },
      },
      actions: {
        continue_learning: true,
        reset_progress: true,
      },
      tabs: {
        all: cardIds,
        remembered: rememberedList,
        not_remembered: notRememberedList.length > 0 ? notRememberedList : cardIds.filter((id) => !rememberedList.includes(id)),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getLastStudyRound = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);
    const userId = req.user.user_id;

    const set = await prisma.fcsets.findFirst({
      where: { set_id: setId, user_id: userId },
      include: { fccards: true },
    });
    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    const latest = await prisma.flashcard_sessions.findFirst({
      where: { user_id: userId, set_id: setId },
      orderBy: { completed_at: "desc" },
    });

    const settings = await getOrCreateUserSettings(userId);
    const playlistConfig = normalizePlaylistConfig(settings.playlist_config);
    const flashRound = playlistConfig.flashcard_rounds?.[setId] ?? {};

    if (!latest || !flashRound.round_id) {
      return res.json({
        round: {},
        chart: { slices: { remembered: 0, not_remembered: 0 } },
        tabs: { all: [], remembered: [], not_remembered: [] },
        actions: { continue_learning: false, reset_progress: false },
      });
    }

    res.json({
      round: {
        round_id: flashRound.round_id,
        set_id: setId,
        total_cards: flashRound.total_cards ?? set.fccards.length,
        remembered_count: latest.remembered_count,
        not_remembered_count: latest.not_remembered_count,
        completed_at: flashRound.completed_at ?? latest.completed_at,
      },
      chart: {
        slices: {
          remembered: latest.remembered_count,
          not_remembered: latest.not_remembered_count,
        },
      },
      tabs: flashRound.tabs ?? {
        all: set.fccards.map((c) => c.card_id),
        remembered: [],
        not_remembered: [],
      },
      actions: { continue_learning: true, reset_progress: true },
    });
  } catch (err) {
    next(err);
  }
};

export const resetStudyRound = async (req, res, next) => {
  try {
    const setId = parseInt(req.params.setId);
    const userId = req.user.user_id;

    const set = await prisma.fcsets.findFirst({
      where: { set_id: setId, user_id: userId },
    });
    if (!set) {
      return res.status(404).json({ message: "Không tìm thấy set" });
    }

    await prisma.flashcard_sessions.deleteMany({
      where: { user_id: userId, set_id: setId },
    });

    await prisma.fccards.updateMany({
      where: { set_id: setId },
      data: { mastery_level: 1 },
    });

    const settings = await getOrCreateUserSettings(userId);
    const playlistConfig = normalizePlaylistConfig(settings.playlist_config);
    if (playlistConfig.flashcard_rounds) {
      delete playlistConfig.flashcard_rounds[setId];
    }
    await prisma.user_settings.update({
      where: { user_id: userId },
      data: {
        playlist_config: {
          playlist: playlistConfig.playlist ?? [],
          flashcard_rounds: playlistConfig.flashcard_rounds ?? {},
        },
      },
    });

    res.json({
      round: {},
      chart: { slices: { remembered: 0, not_remembered: 0 } },
      tabs: { all: [], remembered: [], not_remembered: [] },
      actions: { continue_learning: false, reset_progress: false },
      message: "Đã xóa tiến trình học của set",
    });
  } catch (err) {
    next(err);
  }
};