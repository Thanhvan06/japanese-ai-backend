import { prisma } from "../prisma.js";

export function requireAdmin(requiredRole = null) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Thiếu token" });
      const admin = await prisma.admins.findUnique({
        where: { user_id: req.user.user_id },
      });
      if (!admin) return res.status(403).json({ message: "Không phải admin" });
      if (requiredRole && admin.role !== requiredRole)
        return res.status(403).json({ message: "Quyền không đủ" });
      req.admin = admin;
      next();
    } catch (err) {
      next(err);
    }
  };
}




