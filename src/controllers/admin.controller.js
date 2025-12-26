import { prisma } from "../prisma.js";
import { recordAdminAudit } from "../services/adminAudit.service.js";

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
    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { display_name: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};

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
    const result = { ...toPublicUser(u), adminRole: adminRec?.role ?? null };
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

    // record audit
    try {
      await recordAdminAudit(req.user.user_id, "upload_avatar", id, { filename: req.file.filename });
    } catch {}

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
    // record audit
    try {
      await recordAdminAudit(req.user.user_id, "update_user", id, { data });
    } catch {}
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
    await recordAdminAudit(req.user.user_id, "promote", targetId, { role });
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
    await recordAdminAudit(req.user.user_id, "demote", targetId, {});
    res.json({ message: "Đã hủy quyền admin" });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await prisma.users.delete({ where: { user_id: id } });
    await recordAdminAudit(req.user.user_id, "delete_user", id, {});
    res.json({ message: "Đã xóa user" });
  } catch (err) {
    next(err);
  }
};


