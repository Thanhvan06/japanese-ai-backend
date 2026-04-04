import { prisma } from "../prisma.js";
import { loadPracticeProgressForUser } from "../services/practiceProgress.service.js";

/**
 * GET /api/admin/progress/user/:userId
 * Tiến độ luyện đọc / nghe / nói của một người dùng (admin).
 */
export const getAdminUserPracticeProgress = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: "userId không hợp lệ" });
    }

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        display_name: true,
      },
    });
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const body = await loadPracticeProgressForUser(userId);

    res.json({
      user,
      ...body,
    });
  } catch (err) {
    next(err);
  }
};
