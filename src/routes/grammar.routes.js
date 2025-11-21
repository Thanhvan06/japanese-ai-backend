import { Router } from "express";
import {
  getGrammarByLevel,
  getGrammarDetail,
} from "../controllers/grammar.controller.js";

const router = Router();

router.get("/", getGrammarByLevel);      // GET /api/grammar?level=N5
router.get("/:id", getGrammarDetail);    // GET /api/grammar/123

export default router;
