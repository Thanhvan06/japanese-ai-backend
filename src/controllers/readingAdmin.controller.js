import { z } from "zod";
import { prisma } from "../prisma.js";

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const EXERCISE_TYPES = ["reading_comprehension", "fill_in_the_blank"];

const createSetSchema = z.object({
  title: z.string().min(1),
  jlpt_level: z.enum(JLPT_LEVELS),
  is_published: z.boolean().optional(),
});

const updateSetSchema = z.object({
  title: z.string().min(1).optional(),
  jlpt_level: z.enum(JLPT_LEVELS).optional(),
  is_published: z.boolean().optional(),
});

const createItemSchema = z.object({
  set_id: z.number().int().positive(),
  exercise_type: z.enum(EXERCISE_TYPES),
  passage: z.string().min(1),
  question: z.string().nullable().optional(),
  options: z.array(z.string()).optional(),
  correct_index: z.number().int().min(0).nullable().optional(),
  blanks: z
    .array(
      z.object({
        position: z.number().int().positive(),
        options: z.array(z.string()),
        correct_index: z.number().int().min(0),
      })
    )
    .optional(),
  explain_viet: z.string().nullable().optional(),
});

const updateItemSchema = createItemSchema
  .omit({ set_id: true })
  .partial();

function parseBool(val) {
  if (val === undefined) return undefined;
  return val === "true" || val === true;
}

export const listReadingSetsAdmin = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const { jlpt_level, is_published } = req.query;

    const where = {};
    if (jlpt_level && JLPT_LEVELS.includes(jlpt_level)) {
      where.jlpt_level = jlpt_level;
    }
    const published = parseBool(is_published);
    if (published !== undefined) where.is_published = published;

    const [items, total] = await Promise.all([
      prisma.reading_sets.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { set_id: "desc" },
        include: { _count: { select: { items: true } } },
      }),
      prisma.reading_sets.count({ where }),
    ]);

    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
};

export const createReadingSetAdmin = async (req, res, next) => {
  try {
    const data = createSetSchema.parse(req.body);
    const item = await prisma.reading_sets.create({
      data: {
        title: data.title,
        jlpt_level: data.jlpt_level,
        is_published: data.is_published ?? false,
      },
    });
    res.status(201).json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }
    next(err);
  }
};

export const updateReadingSetAdmin = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }
    const existing = await prisma.reading_sets.findUnique({
      where: { set_id: id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy bộ bài đọc" });
    }

    const data = updateSetSchema.parse(req.body);
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.jlpt_level !== undefined) updateData.jlpt_level = data.jlpt_level;
    if (data.is_published !== undefined)
      updateData.is_published = data.is_published;

    const item = await prisma.reading_sets.update({
      where: { set_id: id },
      data: updateData,
    });
    res.json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }
    next(err);
  }
};

export const togglePublishReadingSetAdmin = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }
    const existing = await prisma.reading_sets.findUnique({
      where: { set_id: id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy bộ bài đọc" });
    }

    const item = await prisma.reading_sets.update({
      where: { set_id: id },
      data: { is_published: !existing.is_published },
    });
    res.json({ item });
  } catch (err) {
    next(err);
  }
};

export const deleteReadingSetAdmin = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }
    const existing = await prisma.reading_sets.findUnique({
      where: { set_id: id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy bộ bài đọc" });
    }
    await prisma.reading_sets.delete({ where: { set_id: id } });
    res.json({ message: "Đã xóa" });
  } catch (err) {
    next(err);
  }
};

export const listReadingItemsAdmin = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const setId = req.query.set_id ? Number(req.query.set_id) : null;
    const exerciseType = req.query.exercise_type;

    const where = {};
    if (setId && !Number.isNaN(setId)) where.set_id = setId;
    if (exerciseType && EXERCISE_TYPES.includes(exerciseType)) {
      where.exercise_type = exerciseType;
    }

    const [items, total] = await Promise.all([
      prisma.reading_items.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { item_id: "desc" },
        include: { set: true },
      }),
      prisma.reading_items.count({ where }),
    ]);

    res.json({ items, total, page, limit });
  } catch (err) {
    next(err);
  }
};

export const getReadingItemAdmin = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }
    const item = await prisma.reading_items.findUnique({
      where: { item_id: id },
      include: { set: true },
    });
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy bài đọc" });
    }
    res.json({ item });
  } catch (err) {
    next(err);
  }
};

export const createReadingItemAdmin = async (req, res, next) => {
  try {
    const data = createItemSchema.parse(req.body);

    const set = await prisma.reading_sets.findUnique({
      where: { set_id: data.set_id },
    });
    if (!set) {
      return res.status(400).json({ message: "Set không tồn tại" });
    }

    if (data.exercise_type === "reading_comprehension") {
      const opts = data.options || [];
      if (opts.length < 2) {
        return res.status(400).json({ message: "Thiếu options (>= 2)" });
      }
      if (data.correct_index === null || data.correct_index === undefined) {
        return res.status(400).json({ message: "Thiếu correct_index" });
      }
      if (data.correct_index < 0 || data.correct_index >= opts.length) {
        return res.status(400).json({ message: "correct_index không hợp lệ" });
      }
    }

    if (data.exercise_type === "fill_in_the_blank") {
      const blanks = data.blanks || [];
      if (blanks.length < 1) {
        return res.status(400).json({ message: "Thiếu blanks (>= 1)" });
      }
      for (const b of blanks) {
        if (!b.options?.length) {
          return res.status(400).json({ message: "Blank thiếu options" });
        }
        if (b.correct_index < 0 || b.correct_index >= b.options.length) {
          return res.status(400).json({ message: "Blank correct_index sai" });
        }
      }
    }

    const item = await prisma.reading_items.create({
      data: {
        set_id: data.set_id,
        exercise_type: data.exercise_type,
        passage: data.passage,
        question: data.question ?? null,
        options_json: data.options ? JSON.stringify(data.options) : null,
        correct_index:
          data.correct_index === undefined ? null : data.correct_index ?? null,
        blanks_json: data.blanks ? JSON.stringify(data.blanks) : null,
        explain_viet: data.explain_viet ?? null,
      },
    });

    res.status(201).json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }
    next(err);
  }
};

export const updateReadingItemAdmin = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }
    const existing = await prisma.reading_items.findUnique({
      where: { item_id: id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy bài đọc" });
    }

    const data = updateItemSchema.parse(req.body);
    const updateData = {};

    if (data.exercise_type !== undefined)
      updateData.exercise_type = data.exercise_type;
    if (data.passage !== undefined) updateData.passage = data.passage;
    if (data.question !== undefined) updateData.question = data.question;
    if (data.options !== undefined)
      updateData.options_json = data.options
        ? JSON.stringify(data.options)
        : null;
    if (data.correct_index !== undefined)
      updateData.correct_index = data.correct_index ?? null;
    if (data.blanks !== undefined)
      updateData.blanks_json = data.blanks ? JSON.stringify(data.blanks) : null;
    if (data.explain_viet !== undefined)
      updateData.explain_viet = data.explain_viet;

    const item = await prisma.reading_items.update({
      where: { item_id: id },
      data: updateData,
    });

    res.json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }
    next(err);
  }
};

export const deleteReadingItemAdmin = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }
    const existing = await prisma.reading_items.findUnique({
      where: { item_id: id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy bài đọc" });
    }
    await prisma.reading_items.delete({ where: { item_id: id } });
    res.json({ message: "Đã xóa" });
  } catch (err) {
    next(err);
  }
};


