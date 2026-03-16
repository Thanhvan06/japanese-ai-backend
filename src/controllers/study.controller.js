import { z } from "zod";
import { prisma } from "../prisma.js";

const sessionSchema = z.object({
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationMinutes: z.number().int().positive().max(24 * 60),
  source: z.string().max(50).optional(),
  activityType: z.string().max(50).optional(),
});

const settingsSchema = z.object({
  dailyGoalMinutes: z.number().int().min(5).max(600),
});

export const createStudySession = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Cần đăng nhập" });
    }

    const body = sessionSchema.parse(req.body);

    const startedAt = new Date(body.startedAt);
    const endedAt = new Date(body.endedAt);

    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
      return res.status(400).json({ message: "Thời gian không hợp lệ" });
    }

    if (endedAt <= startedAt) {
      return res
        .status(400)
        .json({ message: "endedAt phải sau startedAt" });
    }

    const session = await prisma.study_sessions.create({
      data: {
        user_id: req.user.user_id,
        started_at: startedAt,
        ended_at: endedAt,
        duration_minutes: body.durationMinutes,
        source: body.source ?? null,
        activity_type: body.activityType ?? null,
      },
    });

    // eslint-disable-next-line no-console
    console.log("[study] created session", {
      user_id: req.user.user_id,
      session_id: session.session_id,
      duration_minutes: session.duration_minutes,
      started_at: session.started_at,
      ended_at: session.ended_at,
      source: session.source,
      activity_type: session.activity_type,
    });

    return res.status(201).json({ ok: true, session_id: session.session_id });
  } catch (err) {
    next(err);
  }
};

export const updateStudySettings = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Cần đăng nhập" });
    }

    const { dailyGoalMinutes } = settingsSchema.parse(req.body);

    const settings = await prisma.study_settings.upsert({
      where: { user_id: req.user.user_id },
      update: { daily_goal_minutes: dailyGoalMinutes },
      create: {
        user_id: req.user.user_id,
        daily_goal_minutes: dailyGoalMinutes,
      },
    });

    return res.json({
      dailyGoalMinutes: settings.daily_goal_minutes,
    });
  } catch (err) {
    next(err);
  }
};

function toDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export const getStudyProgress = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Cần đăng nhập" });
    }

    const userId = req.user.user_id;
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const settings =
      (await prisma.study_settings.findUnique({
        where: { user_id: userId },
      })) ?? { daily_goal_minutes: 30 };

    const todaysSessions = await prisma.study_sessions.findMany({
      where: {
        user_id: userId,
        started_at: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
      select: { duration_minutes: true },
    });

    const todayMinutes = todaysSessions.reduce(
      (sum, s) => sum + s.duration_minutes,
      0
    );

    const goal = settings.daily_goal_minutes;
    const goalReachedToday = todayMinutes >= goal;

    const historyDays = 60;
    const since = new Date(todayStart);
    since.setDate(since.getDate() - historyDays);

    const historySessions = await prisma.study_sessions.findMany({
      where: {
        user_id: userId,
        started_at: {
          gte: since,
          lt: todayEnd,
        },
      },
      select: {
        started_at: true,
        duration_minutes: true,
      },
    });

    const minutesByDay = new Map();
    for (const s of historySessions) {
      const d = toDateOnly(s.started_at);
      const key = d.toISOString().slice(0, 10);
      const current = minutesByDay.get(key) ?? 0;
      minutesByDay.set(key, current + (s.duration_minutes || 0));
    }

    let currentStreak = 0;
    let longestStreak = 0;

    const iterDate = new Date(todayStart);
    for (let i = 0; i < historyDays; i += 1) {
      const key = iterDate.toISOString().slice(0, 10);
      const minutes = minutesByDay.get(key) ?? 0;
      const reached = minutes >= goal;

      if (reached) {
        currentStreak += 1;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      } else if (iterDate <= todayStart) {
        currentStreak = 0;
      }

      iterDate.setDate(iterDate.getDate() - 1);
    }

    return res.json({
      todayMinutes,
      dailyGoalMinutes: goal,
      goalReachedToday,
      currentStreak,
      longestStreak,
    });
  } catch (err) {
    next(err);
  }
};

