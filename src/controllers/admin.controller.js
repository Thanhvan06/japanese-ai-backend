import { prisma } from "../prisma.js";

function toPublicUser(u) {
  return {
    user_id: u.user_id,
    email: u.email,
    display_name: u.display_name,
    avatar_url: u.avatar_url ?? null,
    role: u.role ?? "user",
    is_active: u.is_active,
    created_at: u.created_at,
    last_login: u.last_login ?? null,
  };
}

export const listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const q = req.query.q?.trim();
    const isActive = req.query.is_active;
    
    const where = {};
    
    // Search filter
    if (q) {
      where.OR = [
        { email: { contains: q } },
        { display_name: { contains: q } },
      ];
    }
    
    // Active status filter
    if (isActive !== undefined) {
      where.is_active = isActive === "true" || isActive === true;
    }

    const [items, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      prisma.users.count({ where }),
    ]);

    const users = await Promise.all(
      items.map(async (u) => {
        const adminRec = await prisma.admins.findUnique({
          where: { user_id: u.user_id },
        });
        return { ...toPublicUser(u), adminRole: adminRec?.role ?? null };
      })
    );

    res.json({ users, total, page, limit });
  } catch (err) {
    next(err);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const u = await prisma.users.findUnique({ where: { user_id: id } });
    if (!u) return res.status(404).json({ message: "Không tìm thấy user" });
    
    const adminRec = await prisma.admins.findUnique({ where: { user_id: id } });
    
    // Lấy thống kê chi tiết của user
    // Wrap các query trong try-catch để xử lý trường hợp bảng chưa tồn tại
    const [
      flashcardSetsCount,
      flashcardFoldersCount,
      flashcardCardsCount,
      totalPracticeTimes,
      diaryEntriesCount,
      chatSessionsCount,
      listeningAttemptsCount,
      vocabLearnedCount,
      grammarLearnedCount,
    ] = await Promise.all([
      prisma.fcsets.count({ where: { user_id: id } }).catch(() => 0),
      prisma.fcfolders.count({ where: { user_id: id } }).catch(() => 0),
      prisma.fcsets.findMany({
        where: { user_id: id },
        include: { fccards: true },
      }).then(sets => sets.reduce((sum, set) => sum + set.fccards.length, 0)).catch(() => 0),
      prisma.fcsets.aggregate({
        where: { user_id: id },
        _sum: { times_practiced: true },
      }).then(result => result._sum.times_practiced ?? 0).catch(() => 0),
      prisma.diaryentries.count({ where: { user_id: id } }).catch(() => 0),
      prisma.chatsessions.count({ where: { user_id: id } }).catch(() => 0),
      prisma.listening_attempts.count({ where: { user_id: id } }).catch(() => 0),
      prisma.uservocabstatus.count({ where: { user_id: id } }).catch(() => 0),
      prisma.usergrammarstatus.count({ where: { user_id: id } }).catch(() => 0),
    ]);

    const result = {
      ...toPublicUser(u),
      adminRole: adminRec?.role ?? null,
      statistics: {
        flashcard_sets: flashcardSetsCount,
        flashcard_folders: flashcardFoldersCount,
        flashcard_cards: flashcardCardsCount,
        total_practice_times: totalPracticeTimes,
        diary_entries: diaryEntriesCount,
        chat_sessions: chatSessionsCount,
        listening_attempts: listeningAttemptsCount,
        vocab_learned: vocabLearnedCount,
        grammar_learned: grammarLearnedCount,
      },
    };
    
    res.json({ user: result });
  } catch (err) {
    next(err);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const baseUrl = process.env.BASE_URL || "http://localhost:4000";
    const fileUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;

    const updated = await prisma.users.update({
      where: { user_id: id },
      data: { avatar_url: fileUrl },
    });

    res.json({ user: toPublicUser(updated), url: fileUrl });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { display_name, is_active } = req.body;
    const data = {};
    if (display_name !== undefined) data.display_name = display_name;
    if (is_active !== undefined) data.is_active = Boolean(is_active);

    const updated = await prisma.users.update({
      where: { user_id: id },
      data,
    });
    res.json({ user: toPublicUser(updated) });
  } catch (err) {
    next(err);
  }
};

export const promoteToAdmin = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const { role } = req.body; // 'super_admin' or 'content_manager'
    if (!role) return res.status(400).json({ message: "Thiếu role" });
    // create admins metadata and set users.role = 'admin'
    await prisma.$transaction([
      prisma.admins.create({
        data: {
          user_id: targetId,
          role,
          assigned_by: req.user.user_id,
        },
      }),
      prisma.users.update({
        where: { user_id: targetId },
        data: { role: "admin" },
      }),
    ]);
    res.status(201).json({ message: "Đã thăng cấp làm admin" });
  } catch (err) {
    next(err);
  }
};

export const demoteAdmin = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    await prisma.$transaction([
      prisma.admins.delete({ where: { user_id: targetId } }),
      prisma.users.update({ where: { user_id: targetId }, data: { role: "user" } }),
    ]);
    res.json({ message: "Đã hủy quyền admin" });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.users.delete({ where: { user_id: id } });
    res.json({ message: "Đã xóa user" });
  } catch (err) {
    next(err);
  }
};

export const activateUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.users.findUnique({ where: { user_id: id } });
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    
    if (user.is_active) {
      return res.status(400).json({ message: "Tài khoản đã được kích hoạt" });
    }

    const updated = await prisma.users.update({
      where: { user_id: id },
      data: { is_active: true },
    });

    res.json({ 
      message: "Đã kích hoạt tài khoản",
      user: toPublicUser(updated) 
    });
  } catch (err) {
    next(err);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.users.findUnique({ where: { user_id: id } });
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    
    if (!user.is_active) {
      return res.status(400).json({ message: "Tài khoản đã bị vô hiệu hóa" });
    }

    const updated = await prisma.users.update({
      where: { user_id: id },
      data: { is_active: false },
    });

    res.json({ 
      message: "Đã vô hiệu hóa tài khoản",
      user: toPublicUser(updated) 
    });
  } catch (err) {
    next(err);
  }
};


