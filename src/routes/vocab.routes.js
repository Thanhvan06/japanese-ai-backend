import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  getVocabByLevel,
  getMatchingCards,
  getTestQuestions,
  getSentenceOrdering,
} from "../controllers/vocab.controller.js";

const router = Router();

router.get("/", getVocabByLevel);     // GET /api/vocab?level=N5
router.get("/practice/matching", getMatchingCards);     // GET /api/vocab/practice/matching?level=N5&limit=10
// Optional auth for test endpoint (required if flashcardSetId is used)
router.get("/practice/test", auth(false), getTestQuestions);         // GET /api/vocab/practice/test?level=N5&limit=10&type=image|kanji-hiragana|hiragana-kanji|word-meaning&topic=1&flashcardSetId=1
router.get("/practice/sentence", getSentenceOrdering); // GET /api/vocab/practice/sentence?level=N5&limit=10

export default router;
