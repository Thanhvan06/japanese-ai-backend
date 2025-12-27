import { z } from "zod";
import { prisma } from "../prisma.js";

// ---------- Helpers ----------
const stateSchema = z.object({
  theme: z.record(z.any()).optional(),
  playlist: z.any().optional(),
});

const todoSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được trống"),
  timerDuration: z.number().int().nonnegative().optional(),
});

const updateTodoSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(["pending", "in_progress", "done"]).optional(),
  timerDuration: z.number().int().nonnegative().optional(),
});

function normalizeSettings(settings) {
  return {
    theme: settings?.theme_config ?? {},
    playlistRaw: settings?.playlist_config ?? [],
    todoConfig: settings?.todo_config ?? {},
  };
}

function normalizePlaylistConfig(playlistRaw) {
  if (Array.isArray(playlistRaw)) {
    return { playlist: playlistRaw, flashcard_rounds: {} };
  }
  return {
    playlist: playlistRaw?.playlist ?? [],
    flashcard_rounds: playlistRaw?.flashcard_rounds ?? {},
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

async function clearActiveTimer(userId) {
  await prisma.user_settings.update({
    where: { user_id: userId },
    data: {
      todo_config: {
        ...(await getOrCreateUserSettings(userId)).todo_config,
        active_timer: {},
      },
    },
  });
}

// Reusable for auth responses
export async function getPersonalRoomStateForUser(userId) {
  const settings = await getOrCreateUserSettings(userId);
  const { theme, playlistRaw, todoConfig } = normalizeSettings(settings);
  const playlistConfig = normalizePlaylistConfig(playlistRaw);

  const todos = await prisma.todos.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });

  return {
    theme: theme ?? {},
    playlist: playlistConfig.playlist ?? [],
    todos: todos.map((t) => ({
      todo_id: t.todo_id,
      title: t.title,
      expected_duration: t.expected_duration ?? 0,
      status: t.status ?? "pending",
      created_at: t.created_at,
    })),
    active_timer: todoConfig?.active_timer ?? {},
  };
}

// ---------- State APIs ----------
export const getPersonalRoomState = async (req, res, next) => {
  try {
    const state = await getPersonalRoomStateForUser(req.user.user_id);
    res.json({ state });
  } catch (err) {
    next(err);
  }
};

export const updatePersonalRoomState = async (req, res, next) => {
  try {
    const data = stateSchema.parse(req.body);
    const userId = req.user.user_id;
    const settings = await getOrCreateUserSettings(userId);
    const playlistConfig = normalizePlaylistConfig(settings.playlist_config);

    const updated = await prisma.user_settings.update({
      where: { user_id: userId },
      data: {
        theme_config: data.theme ?? settings.theme_config ?? {},
        playlist_config: {
          playlist: data.playlist ?? playlistConfig.playlist ?? [],
          flashcard_rounds: playlistConfig.flashcard_rounds ?? {},
        },
      },
    });

    res.json({
      state: {
        theme: updated.theme_config ?? {},
        playlist: normalizePlaylistConfig(updated.playlist_config).playlist ?? [],
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------- Todo CRUD ----------
export const listTodos = async (req, res, next) => {
  try {
    const todos = await prisma.todos.findMany({
      where: { user_id: req.user.user_id },
      orderBy: { created_at: "desc" },
    });
    res.json({
      todos: todos.map((t) => ({
        todo_id: t.todo_id,
        title: t.title,
        expected_duration: t.expected_duration ?? 0,
        status: t.status ?? "pending",
        created_at: t.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const createTodo = async (req, res, next) => {
  try {
    const body = todoSchema.parse(req.body);
    const todo = await prisma.todos.create({
      data: {
        user_id: req.user.user_id,
        title: body.title,
        expected_duration: body.timerDuration ?? body.expectedDuration ?? null,
        status: "pending",
      },
    });
    res.status(201).json({
      todo: {
        todo_id: todo.todo_id,
        title: todo.title,
        expected_duration: todo.expected_duration ?? 0,
        status: todo.status ?? "pending",
        created_at: todo.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateTodo = async (req, res, next) => {
  try {
    const todoId = parseInt(req.params.todoId);
    const body = updateTodoSchema.parse(req.body);
    const todo = await prisma.todos.findFirst({
      where: { todo_id: todoId, user_id: req.user.user_id },
    });
    if (!todo) {
      return res.status(404).json({ message: "Không tìm thấy todo" });
    }

    const updated = await prisma.todos.update({
      where: { todo_id: todoId },
      data: {
        title: body.title ?? todo.title,
        status: body.status ?? todo.status,
        expected_duration:
          body.timerDuration !== undefined
            ? body.timerDuration
            : todo.expected_duration,
      },
    });

    res.json({
      todo: {
        todo_id: updated.todo_id,
        title: updated.title,
        expected_duration: updated.expected_duration ?? 0,
        status: updated.status ?? "pending",
        created_at: updated.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------- Timer logic ----------
const startTimerSchema = z.object({
  timerDuration: z.number().int().nonnegative().optional(),
});

export const startTodoTimer = async (req, res, next) => {
  try {
    const todoId = parseInt(req.params.todoId);
    const body = startTimerSchema.parse(req.body ?? {});
    const userId = req.user.user_id;

    const todo = await prisma.todos.findFirst({
      where: { todo_id: todoId, user_id: userId },
    });
    if (!todo) {
      return res.status(404).json({ message: "Không tìm thấy todo" });
    }

    const settings = await getOrCreateUserSettings(userId);
    const currentActive = settings.todo_config?.active_timer;
    if (currentActive && currentActive.session_id) {
      return res
        .status(409)
        .json({ message: "Đã có một timer đang chạy, hãy dừng trước" });
    }

    const now = new Date();
    const session = await prisma.study_sessions.create({
      data: {
        user_id: userId,
        source: "todo",
        source_id: todoId,
        start_time: now,
        end_time: now,
        duration_seconds: 0,
      },
    });

    await prisma.todos.update({
      where: { todo_id: todoId },
      data: {
        status: "in_progress",
        expected_duration:
          body.timerDuration !== undefined
            ? body.timerDuration
            : todo.expected_duration,
      },
    });

    await prisma.user_settings.update({
      where: { user_id: userId },
      data: {
        todo_config: {
          ...(settings.todo_config ?? {}),
          active_timer: {
            session_id: session.session_id,
            todo_id: todoId,
            started_at: now.toISOString(),
            expected_duration:
              body.timerDuration !== undefined
                ? body.timerDuration
                : todo.expected_duration ?? 0,
          },
        },
      },
    });

    res.status(201).json({
      active_timer: {
        session_id: session.session_id,
        todo_id: todoId,
        started_at: now,
        expected_duration:
          body.timerDuration !== undefined
            ? body.timerDuration
            : todo.expected_duration ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

const stopTimerSchema = z.object({
  markDone: z.boolean().optional(),
});

export const stopTodoTimer = async (req, res, next) => {
  try {
    const todoId = parseInt(req.params.todoId);
    const body = stopTimerSchema.parse(req.body ?? {});
    const userId = req.user.user_id;

    const settings = await getOrCreateUserSettings(userId);
    const active = settings.todo_config?.active_timer;
    if (!active || !active.session_id || active.todo_id !== todoId) {
      return res.status(400).json({ message: "Không có timer đang chạy cho todo này" });
    }

    const session = await prisma.study_sessions.findFirst({
      where: {
        session_id: active.session_id,
        user_id: userId,
        source: "todo",
      },
    });
    if (!session) {
      await clearActiveTimer(userId);
      return res.status(404).json({ message: "Không tìm thấy phiên timer" });
    }

    const startedAt = new Date(active.started_at);
    const now = new Date();
    const duration = Math.max(
      0,
      Math.floor((now.getTime() - startedAt.getTime()) / 1000)
    );

    const updatedSession = await prisma.study_sessions.update({
      where: { session_id: session.session_id },
      data: {
        end_time: now,
        duration_seconds: duration,
      },
    });

    if (body.markDone) {
      await prisma.todos.update({
        where: { todo_id: todoId },
        data: { status: "done" },
      });
    }

    await prisma.user_settings.update({
      where: { user_id: userId },
      data: {
        todo_config: {
          ...(settings.todo_config ?? {}),
          active_timer: {},
        },
      },
    });

    res.json({
      session: {
        session_id: updatedSession.session_id,
        todo_id: todoId,
        duration_seconds: updatedSession.duration_seconds ?? 0,
        ended_at: now,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------- Weekly study stats ----------
export const getWeeklyStudyStats = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const sessions = await prisma.study_sessions.findMany({
      where: {
        user_id: userId,
        start_time: { gte: start },
      },
      orderBy: { start_time: "asc" },
    });

    const daily = {};
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().split("T")[0];
      daily[key] = 0;
    }

    sessions.forEach((s) => {
      const key = new Date(s.start_time).toISOString().split("T")[0];
      if (daily[key] !== undefined) {
        daily[key] += s.duration_seconds ?? 0;
      }
    });

    const series = Object.entries(daily).map(([date, seconds]) => ({
      date,
      seconds,
    }));

    const totalWeek = series.reduce((sum, item) => sum + item.seconds, 0);

    res.json({
      range: { start: start.toISOString(), end: today.toISOString() },
      total_seconds: totalWeek,
      daily: series,
    });
  } catch (err) {
    next(err);
  }
};


