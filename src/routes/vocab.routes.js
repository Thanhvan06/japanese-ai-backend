import { Router } from "express";
import {
  getVocabByLevel,
  getMatchingCards,
  getTestQuestions,
  getSentenceOrdering,
} from "../controllers/vocab.controller.js";

const router = Router();

router.get("/", getVocabByLevel);     // GET /api/vocab?level=N5
router.get("/practice/matching", getMatchingCards);     // GET /api/vocab/practice/matching?level=N5&limit=10
router.get("/practice/test", getTestQuestions);         // GET /api/vocab/practice/test?level=N5&limit=10&type=image|fillblank
router.get("/practice/sentence", getSentenceOrdering); // GET /api/vocab/practice/sentence?level=N5&limit=10

export default router;
