import { Router } from "express";
import {
  getSpeakingPhrases,
  getSpeakingPhraseDetail,
  generatePhraseAudio,
  practiceSpeaking,
  getSpeakingAttempts,
  getSpeakingStats,
} from "../controllers/speaking.controller.js";
import upload from "../utils/upload.js";
import { auth } from "../middlewares/auth.js";

const router = Router();

// Public routes
router.get("/phrases", getSpeakingPhrases); // GET /api/speaking/phrases?level=N5&topic=...
router.get("/phrases/:id", getSpeakingPhraseDetail); // GET /api/speaking/phrases/123
router.post("/phrases/:id/generate-audio", generatePhraseAudio); // POST /api/speaking/phrases/123/generate-audio

// Protected routes (cần đăng nhập)
router.post("/practice", upload.single("audio"), practiceSpeaking); // POST /api/speaking/practice
router.get("/attempts", auth(true), getSpeakingAttempts); // GET /api/speaking/attempts
router.get("/stats", auth(true), getSpeakingStats); // GET /api/speaking/stats

export default router;

