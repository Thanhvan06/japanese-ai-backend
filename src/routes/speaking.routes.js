import { Router } from "express";
import {
  getSpeakingPhrases,
  getSpeakingPhraseDetail,
  generatePhraseAudio,
  practiceSpeaking,
  getSpeakingAttempts,
  getSpeakingStats,
  getSpeakingProgress,
  getAdminSpeakingPhrases,
  createAdminSpeakingPhrase,
  updateAdminSpeakingPhrase,
  deleteAdminSpeakingPhrase,
  getAdminSpeakingStatsOverview,
} from "../controllers/speaking.controller.js";
import upload from "../utils/upload.js";
import { auth } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/admin.js";

const router = Router();

// Public routes
router.get("/phrases", getSpeakingPhrases); // GET /api/speaking/phrases?level=N5&topic=...
router.get("/phrases/:id", getSpeakingPhraseDetail); // GET /api/speaking/phrases/123
router.post("/phrases/:id/generate-audio", generatePhraseAudio); // POST /api/speaking/phrases/123/generate-audio

// Practice: optional auth — lưu attempt khi user đã đăng nhập (có Bearer token)
router.post(
  "/practice",
  auth(false),
  upload.single("audio"),
  practiceSpeaking
);
router.get("/attempts", auth(true), getSpeakingAttempts);
router.get("/stats", auth(true), getSpeakingStats);
router.get("/progress", auth(false), getSpeakingProgress);

// Admin routes
router.get(
  "/admin/phrases",
  auth(true),
  requireAdmin(),
  getAdminSpeakingPhrases
);
router.post(
  "/admin/phrases",
  auth(true),
  requireAdmin(),
  createAdminSpeakingPhrase
);
router.put(
  "/admin/phrases/:id",
  auth(true),
  requireAdmin(),
  updateAdminSpeakingPhrase
);
router.delete(
  "/admin/phrases/:id",
  auth(true),
  requireAdmin(),
  deleteAdminSpeakingPhrase
);
router.get(
  "/admin/stats/overview",
  auth(true),
  requireAdmin(),
  getAdminSpeakingStatsOverview
);

export default router;

