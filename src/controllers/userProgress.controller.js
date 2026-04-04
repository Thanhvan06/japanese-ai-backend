import { prisma } from "../prisma.js";
import { loadPracticeProgressForUser } from "../services/practiceProgress.service.js";

/**
 * GET /api/progress/me — tiến độ luyện đọc / nghe / nói của user đăng nhập.
 */
export const getMyPracticeProgress = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ message: "Cần đăng nhập" });
    }

    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        display_name: true,
      },
    });

    const body = await loadPracticeProgressForUser(userId);

    res.json({
      user: user ?? { user_id: userId, display_name: null },
      ...body,
    });
  } catch (err) {
    next(err);
  }
};
