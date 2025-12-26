import { Router } from "express";
import {
  getGrammarByLevel,
  getGrammarDetail,
  getGrammarExercises,
} from "../controllers/grammar.controller.js";

const router = Router();

router.get("/", getGrammarByLevel);      // GET /api/grammar?level=N5
router.get("/exercises", getGrammarExercises);  // GET /api/grammar/exercises?level=N5&question_type=multiple_choice&limit=10
router.get("/:id", getGrammarDetail);    // GET /api/grammar/123

export default router;
