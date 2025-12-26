import { prisma } from "../prisma.js";

// GET /api/grammar?level=N5
export const getGrammarByLevel = async (req, res, next) => {
  try {
    const { level } = req.query;

    if (!level) {
      return res.status(400).json({
        message: "Thiếu tham số level (N5, N4, N3, N2, N1)",
      });
    }

    const items = await prisma.grammarrules.findMany({
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

    const grammar = await prisma.grammarrules.findUnique({
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
    const grammars = await prisma.grammarrules.findMany({
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