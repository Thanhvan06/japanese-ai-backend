import { prisma } from "../prisma.js";
import { z } from "zod";
import { recordAdminAudit } from "../services/adminAudit.service.js";

// ----- Admin Schemas -----
const createGrammarSchema = z.object({
  grammar_structure: z.string().min(1, "Grammar structure là bắt buộc"),
  explanation_viet: z.string().min(1, "Explanation là bắt buộc"),
  example_jp: z.string().min(1, "Example JP là bắt buộc"),
  example_viet: z.string().nullable().optional(),
  jlpt_level: z.enum(["N5", "N4", "N3", "N2", "N1"], {
    errorMap: () => ({ message: "JLPT level phải là N5, N4, N3, N2, hoặc N1" }),
  }),
  is_published: z.boolean().optional().default(false),
});

const updateGrammarSchema = z.object({
  grammar_structure: z.string().min(1).optional(),
  explanation_viet: z.string().min(1).optional(),
  example_jp: z.string().min(1).optional(),
  example_viet: z.string().nullable().optional(),
  jlpt_level: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional(),
  is_published: z.boolean().optional(),
});

// Admin Exercise Schemas
const optionSchema = z.object({
  option_text: z.string().min(1, "Option text là bắt buộc"),
  is_correct: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const createExerciseSchema = z.object({
  grammar_id: z.number().int().positive(),
  question_type: z.enum(["multiple_choice", "sentence_arrangement"]),
  question_text: z.string().min(1, "Question text là bắt buộc"),
  question_suffix: z.string().nullable().optional(),
  explanation_note: z.string().nullable().optional(),
  difficulty_level: z.enum(["N5", "N4", "N3", "N2", "N1"]),
  options: z.array(optionSchema).min(1, "Cần ít nhất 1 option"),
});

const updateExerciseSchema = z.object({
  grammar_id: z.number().int().positive().optional(),
  question_type: z.enum(["multiple_choice", "sentence_arrangement"]).optional(),
  question_text: z.string().min(1).optional(),
  question_suffix: z.string().nullable().optional(),
  explanation_note: z.string().nullable().optional(),
  difficulty_level: z.enum(["N5", "N4", "N3", "N2", "N1"]).optional(),
  options: z.array(optionSchema).min(1).optional(),
});

// GET /api/grammar?level=N5
export const getGrammarByLevel = async (req, res, next) => {
  try {
    const { level } = req.query;

    if (!level) {
      return res.status(400).json({
        message: "Thiếu tham số level (N5, N4, N3, N2, N1)",
      });
    }

    const items = await prisma.grammar.findMany({
      where: {
        jlpt_level: level,
        is_published: true,
      },
      orderBy: { grammar_id: "asc" },
      select: {
        grammar_id: true,
        grammar_structure: true,
        jlpt_level: true,
      },
    });

    return res.json({ items });
  } catch (err) {
    next(err);
  }
};

// GET /api/grammar/:id
export const getGrammarDetail = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "grammarId không hợp lệ" });
    }

    const grammar = await prisma.grammar.findUnique({
      where: { grammar_id: id },
      select: {
        grammar_id: true,
        grammar_structure: true,
        explanation_viet: true,
        example_jp: true,
        example_viet: true,
        jlpt_level: true,
      },
    });

    if (!grammar) {
      return res.status(404).json({ message: "Không tìm thấy mẫu ngữ pháp" });
    }

    return res.json(grammar);
  } catch (err) {
    next(err);
  }
};

// GET /api/grammar-exercises
export const getGrammarExercises = async (req, res, next) => {
  try {
    const { level, grammar_ids, question_type, limit } = req.query;

    if (!level) {
      return res.status(400).json({
        message: "Thiếu tham số level (N5, N4, N3, N2, N1)",
      });
    }

    if (!question_type || !["multiple_choice", "sentence_arrangement"].includes(question_type)) {
      return res.status(400).json({
        message: "Thiếu tham số question_type (multiple_choice | sentence_arrangement)",
      });
    }

    // Parse grammar_ids from query (can be array or single value)
    // Handle both 'grammar_ids' and 'grammar_ids[]' formats from Express
    let parsedGrammarIds = null;
    const grammarIdsParam = grammar_ids || req.query['grammar_ids[]'];
    
    if (grammarIdsParam) {
      if (Array.isArray(grammarIdsParam)) {
        parsedGrammarIds = grammarIdsParam.map(id => Number(id)).filter(id => !Number.isNaN(id));
      } else if (typeof grammarIdsParam === 'string' && grammarIdsParam.includes(',')) {
        // Handle comma-separated string
        parsedGrammarIds = grammarIdsParam.split(',').map(id => Number(id.trim())).filter(id => !Number.isNaN(id));
      } else {
        const numId = Number(grammarIdsParam);
        if (!Number.isNaN(numId)) {
          parsedGrammarIds = [numId];
        }
      }
    }

    // Build grammar filter
    const grammarWhere = {
      jlpt_level: level,
      is_published: true,
    };

    if (parsedGrammarIds && parsedGrammarIds.length > 0) {
      grammarWhere.grammar_id = { in: parsedGrammarIds };
    }

    // Get grammar IDs that match the filter
    const grammars = await prisma.grammar.findMany({
      where: grammarWhere,
      select: { grammar_id: true },
    });

    const grammarIds = grammars.map(g => g.grammar_id);

    if (grammarIds.length === 0) {
      return res.json([]);
    }

    // Query exercises using raw SQL since tables might not be in Prisma schema yet
    // Assuming table structure: gram_exercises (exercise_id, grammar_id, question_type, question_text, question_suffix, explanation_note, is_active)
    // and gram_exercise_options (option_id, exercise_id, option_text, option_role, is_correct, sort_order)
    
    const limitNum = limit ? Math.min(Number(limit), 100) : 20;

    // Build safe IN clause with placeholders
    const grammarPlaceholders = grammarIds.map(() => '?').join(',');
    const grammarParams = grammarIds.map(id => Number(id));
    
    const exercises = await prisma.$queryRawUnsafe(
      `SELECT 
        e.exercise_id,
        e.question_type,
        e.question_text,
        e.question_suffix,
        e.explanation_note
      FROM gram_exercises e
      WHERE e.grammar_id IN (${grammarPlaceholders})
        AND e.question_type = ?
        AND e.is_active = 1
      ORDER BY RAND()
      LIMIT ?`,
      ...grammarParams,
      question_type,
      limitNum
    );

    if (exercises.length === 0) {
      return res.json([]);
    }

    const exerciseIds = exercises.map(e => Number(e.exercise_id));

    // Fetch options for all exercises
    if (exerciseIds.length === 0) {
      return res.json([]);
    }

    const optionPlaceholders = exerciseIds.map(() => '?').join(',');
    const optionParams = exerciseIds.map(id => Number(id));
    
    const options = await prisma.$queryRawUnsafe(
      `SELECT 
        option_id,
        exercise_id,
        option_text,
        option_role,
        is_correct,
        sort_order
      FROM gram_exercise_options
      WHERE exercise_id IN (${optionPlaceholders})
      ORDER BY exercise_id, sort_order ASC`,
      ...optionParams
    );

    // Group options by exercise_id
    const optionsByExercise = {};
    options.forEach(opt => {
      if (!optionsByExercise[opt.exercise_id]) {
        optionsByExercise[opt.exercise_id] = [];
      }
      optionsByExercise[opt.exercise_id].push({
        option_text: opt.option_text,
        option_role: opt.option_role,
        is_correct: Boolean(opt.is_correct),
        sort_order: opt.sort_order,
      });
    });

    // Combine exercises with their options
    const result = exercises.map(ex => ({
      exercise_id: ex.exercise_id,
      question_type: ex.question_type,
      question_text: ex.question_text,
      question_suffix: ex.question_suffix || null,
      options: optionsByExercise[ex.exercise_id] || [],
      explanation_note: ex.explanation_note || null,
    }));

    return res.json(result);
  } catch (err) {
    // If tables don't exist, return empty array instead of error
    if (err.message && err.message.includes("doesn't exist")) {
      return res.json([]);
    }
    next(err);
  }
};

// ========== ADMIN CRUD OPERATIONS ==========

// GET /api/admin/grammar - List grammar items with filters and pagination
export const listGrammar = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const { jlpt_level, is_published } = req.query;

    const where = {};

    // Filter by jlpt_level
    if (jlpt_level) {
      const validLevels = ["N5", "N4", "N3", "N2", "N1"];
      if (validLevels.includes(jlpt_level)) {
        where.jlpt_level = jlpt_level;
      }
    }

    // Filter by is_published
    if (is_published !== undefined) {
      where.is_published = is_published === "true" || is_published === true;
    }

    const [items, total] = await Promise.all([
      prisma.grammar.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { grammar_id: "desc" },
      }),
      prisma.grammar.count({ where }),
    ]);

    res.json({
      items: items || [],
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/grammar/:id - Get single grammar item
export const getGrammar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const item = await prisma.grammar.findUnique({
      where: { grammar_id: id },
    });

    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy ngữ pháp" });
    }

    res.json({ item });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/grammar - Create new grammar item
export const createGrammar = async (req, res, next) => {
  try {
    const data = createGrammarSchema.parse(req.body);

    const item = await prisma.grammar.create({
      data: {
        grammar_structure: data.grammar_structure,
        explanation_viet: data.explanation_viet,
        example_jp: data.example_jp,
        example_viet: data.example_viet ?? null,
        jlpt_level: data.jlpt_level,
        is_published: data.is_published ?? false,
      },
    });

    // Record audit
    try {
      await recordAdminAudit(req.user.user_id, "create_grammar", null, {
        grammar_id: item.grammar_id,
        grammar_structure: item.grammar_structure,
      });
    } catch {}

    res.status(201).json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: err.errors,
      });
    }
    next(err);
  }
};

// PATCH /api/admin/grammar/:id - Update grammar item
export const updateGrammar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const existing = await prisma.grammar.findUnique({
      where: { grammar_id: id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy ngữ pháp" });
    }

    const data = updateGrammarSchema.parse(req.body);

    const updateData = {};
    if (data.grammar_structure !== undefined)
      updateData.grammar_structure = data.grammar_structure;
    if (data.explanation_viet !== undefined)
      updateData.explanation_viet = data.explanation_viet;
    if (data.example_jp !== undefined) updateData.example_jp = data.example_jp;
    if (data.example_viet !== undefined)
      updateData.example_viet = data.example_viet;
    if (data.jlpt_level !== undefined) updateData.jlpt_level = data.jlpt_level;
    if (data.is_published !== undefined)
      updateData.is_published = data.is_published;

    const item = await prisma.grammar.update({
      where: { grammar_id: id },
      data: updateData,
    });

    // Record audit
    try {
      await recordAdminAudit(req.user.user_id, "update_grammar", null, {
        grammar_id: id,
        changes: data,
      });
    } catch {}

    res.json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: err.errors,
      });
    }
    next(err);
  }
};

// PATCH /api/admin/grammar/:id/publish - Toggle publish status
export const togglePublishGrammar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const existing = await prisma.grammar.findUnique({
      where: { grammar_id: id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy ngữ pháp" });
    }

    const item = await prisma.grammar.update({
      where: { grammar_id: id },
      data: { is_published: !existing.is_published },
    });

    // Record audit
    try {
      await recordAdminAudit(req.user.user_id, "toggle_publish_grammar", null, {
        grammar_id: id,
        is_published: item.is_published,
      });
    } catch {}

    res.json({ item });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/grammar/:id - Delete grammar item
export const deleteGrammar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const existing = await prisma.grammar.findUnique({
      where: { grammar_id: id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy ngữ pháp" });
    }

    await prisma.grammar.delete({
      where: { grammar_id: id },
    });

    // Record audit
    try {
      await recordAdminAudit(req.user.user_id, "delete_grammar", null, {
        grammar_id: id,
        grammar_structure: existing.grammar_structure,
      });
    } catch {}

    res.json({ message: "Đã xóa ngữ pháp" });
  } catch (err) {
    next(err);
  }
};

// ========== ADMIN EXERCISE CRUD OPERATIONS ==========

// Helper: Get next exercise_id
async function getNextExerciseId() {
  const result = await prisma.$queryRaw`
    SELECT COALESCE(MAX(exercise_id), 0) + 1 as next_id
    FROM gram_exercises
  `;
  return Number(result[0]?.next_id || 1);
}

// GET /api/admin/grammar-exercises - List exercises with filters and pagination
export const listGrammarExercises = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const { grammar_id, question_type, difficulty_level, is_active } = req.query;

    const where = {};

    if (grammar_id) {
      const grammarIdNum = Number(grammar_id);
      if (!isNaN(grammarIdNum) && grammarIdNum > 0) {
        where.grammar_id = grammarIdNum;
      }
    }

    if (question_type) {
      const validTypes = ["multiple_choice", "sentence_arrangement"];
      if (validTypes.includes(question_type)) {
        where.question_type = question_type;
      }
    }

    if (difficulty_level) {
      const validLevels = ["N5", "N4", "N3", "N2", "N1"];
      if (validLevels.includes(difficulty_level)) {
        where.difficulty_level = difficulty_level;
      }
    }

    if (is_active !== undefined) {
      where.is_active = is_active === "true" || is_active === true;
    }

    const [items, total] = await Promise.all([
      prisma.gram_exercises.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: "desc" },
      }),
      prisma.gram_exercises.count({ where }),
    ]);

    // Fetch options for each exercise
    const itemsWithOptions = await Promise.all(
      items.map(async (item) => {
        const options = await prisma.gram_exercise_options.findMany({
          where: { exercise_id: item.exercise_id },
          orderBy: { sort_order: "asc" },
        });
        return {
          ...item,
          options,
        };
      })
    );

    res.json({
      items: itemsWithOptions || [],
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/grammar-exercises/:id - Get single exercise
export const getGrammarExercise = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const item = await prisma.gram_exercises.findFirst({
      where: { exercise_id: id },
    });

    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }

    const options = await prisma.gram_exercise_options.findMany({
      where: { exercise_id: id },
      orderBy: { sort_order: "asc" },
    });

    res.json({ item: { ...item, options } });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/grammar-exercises - Create new exercise
export const createGrammarExercise = async (req, res, next) => {
  try {
    const data = createExerciseSchema.parse(req.body);

    // Validate grammar_id exists
    const grammar = await prisma.grammar.findUnique({
      where: { grammar_id: data.grammar_id },
    });
    if (!grammar) {
      return res.status(400).json({ message: "Grammar không tồn tại" });
    }

    // Validate options based on question_type
    if (data.question_type === "multiple_choice") {
      // For multiple_choice: options must have role='choice', at least one is_correct=true
      const hasCorrect = data.options.some((opt) => opt.is_correct === true);
      if (!hasCorrect) {
        return res.status(400).json({
          message: "Multiple choice phải có ít nhất 1 đáp án đúng",
        });
      }
    } else if (data.question_type === "sentence_arrangement") {
      // For sentence_arrangement: all options should have sort_order
      const allHaveSortOrder = data.options.every(
        (opt) => opt.sort_order !== undefined && opt.sort_order !== null
      );
      if (!allHaveSortOrder) {
        return res.status(400).json({
          message: "Sentence arrangement phải có sort_order cho tất cả options",
        });
      }
    }

    // Get next exercise_id
    const exerciseId = await getNextExerciseId();

    // Create exercise and options in transaction
    await prisma.$transaction(async (tx) => {
      // Create exercise
      await tx.gram_exercises.create({
        data: {
          exercise_id: exerciseId,
          grammar_id: data.grammar_id,
          question_type: data.question_type,
          question_text: data.question_text,
          question_suffix: data.question_suffix ?? null,
          explanation_note: data.explanation_note ?? null,
          difficulty_level: data.difficulty_level,
          is_active: true,
        },
      });

      // Create options
      let optionIdCounter = 1;
      for (const option of data.options) {
        await tx.gram_exercise_options.create({
          data: {
            option_id: optionIdCounter++,
            exercise_id: exerciseId,
            option_text: option.option_text,
            option_role:
              data.question_type === "multiple_choice"
                ? "choice"
                : "arrange_word",
            is_correct:
              data.question_type === "multiple_choice"
                ? option.is_correct ?? false
                : null,
            sort_order:
              data.question_type === "sentence_arrangement"
                ? option.sort_order ?? null
                : null,
          },
        });
      }
    });

    // Fetch created exercise with options
    const created = await prisma.gram_exercises.findFirst({
      where: { exercise_id: exerciseId },
    });
    const options = await prisma.gram_exercise_options.findMany({
      where: { exercise_id: exerciseId },
      orderBy: { sort_order: "asc" },
    });

    // Record audit
    try {
      await recordAdminAudit(req.user.user_id, "create_grammar_exercise", null, {
        exercise_id: exerciseId,
        grammar_id: data.grammar_id,
        question_type: data.question_type,
      });
    } catch {}

    res.status(201).json({ item: { ...created, options } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: err.errors,
      });
    }
    next(err);
  }
};

// PUT /api/admin/grammar-exercises/:id - Update exercise
export const updateGrammarExercise = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const existing = await prisma.gram_exercises.findFirst({
      where: { exercise_id: id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }

    const data = updateExerciseSchema.parse(req.body);

    // Validate grammar_id if provided
    if (data.grammar_id !== undefined) {
      const grammar = await prisma.grammar.findUnique({
        where: { grammar_id: data.grammar_id },
      });
      if (!grammar) {
        return res.status(400).json({ message: "Grammar không tồn tại" });
      }
    }

    const questionType = data.question_type ?? existing.question_type;

    // Validate options if provided
    if (data.options !== undefined) {
      if (questionType === "multiple_choice") {
        const hasCorrect = data.options.some((opt) => opt.is_correct === true);
        if (!hasCorrect) {
          return res.status(400).json({
            message: "Multiple choice phải có ít nhất 1 đáp án đúng",
          });
        }
      } else if (questionType === "sentence_arrangement") {
        const allHaveSortOrder = data.options.every(
          (opt) => opt.sort_order !== undefined && opt.sort_order !== null
        );
        if (!allHaveSortOrder) {
          return res.status(400).json({
            message: "Sentence arrangement phải có sort_order cho tất cả options",
          });
        }
      }
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      // Update exercise
      const updateData = {};
      if (data.grammar_id !== undefined) updateData.grammar_id = data.grammar_id;
      if (data.question_type !== undefined)
        updateData.question_type = data.question_type;
      if (data.question_text !== undefined)
        updateData.question_text = data.question_text;
      if (data.question_suffix !== undefined)
        updateData.question_suffix = data.question_suffix;
      if (data.explanation_note !== undefined)
        updateData.explanation_note = data.explanation_note;
      if (data.difficulty_level !== undefined)
        updateData.difficulty_level = data.difficulty_level;

      if (Object.keys(updateData).length > 0) {
        await tx.gram_exercises.updateMany({
          where: { exercise_id: id },
          data: updateData,
        });
      }

      // Update options if provided
      if (data.options !== undefined) {
        // Delete old options
        await tx.gram_exercise_options.deleteMany({
          where: { exercise_id: id },
        });

        // Create new options
        let optionIdCounter = 1;
        for (const option of data.options) {
          await tx.gram_exercise_options.create({
            data: {
              option_id: optionIdCounter++,
              exercise_id: id,
              option_text: option.option_text,
              option_role:
                questionType === "multiple_choice" ? "choice" : "arrange_word",
              is_correct:
                questionType === "multiple_choice"
                  ? option.is_correct ?? false
                  : null,
              sort_order:
                questionType === "sentence_arrangement"
                  ? option.sort_order ?? null
                  : null,
            },
          });
        }
      }
    });

    // Fetch updated exercise with options
    const updated = await prisma.gram_exercises.findFirst({
      where: { exercise_id: id },
    });
    const options = await prisma.gram_exercise_options.findMany({
      where: { exercise_id: id },
      orderBy: { sort_order: "asc" },
    });

    // Record audit
    try {
      await recordAdminAudit(req.user.user_id, "update_grammar_exercise", null, {
        exercise_id: id,
        changes: data,
      });
    } catch {}

    res.json({ item: { ...updated, options } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        errors: err.errors,
      });
    }
    next(err);
  }
};

// DELETE /api/admin/grammar-exercises/:id - Soft delete exercise (set is_active = false)
export const deleteGrammarExercise = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const existing = await prisma.gram_exercises.findFirst({
      where: { exercise_id: id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy bài tập" });
    }

    // Soft delete: set is_active = false
    await prisma.gram_exercises.updateMany({
      where: { exercise_id: id },
      data: { is_active: false },
    });

    // Record audit
    try {
      await recordAdminAudit(req.user.user_id, "delete_grammar_exercise", null, {
        exercise_id: id,
      });
    } catch {}

    res.json({ message: "Đã xóa bài tập" });
  } catch (err) {
    next(err);
  }
};