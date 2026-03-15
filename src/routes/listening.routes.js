import { Router } from "express";
import {
  getListeningByLevel,
  getListeningReview,
  getListeningDetail,
  uploadAudio,
  deleteAudio,
  generateAudio,
  generateAudioBatch,
  recordAttempt,
  getProgress,
  checkDictation,
  checkSentenceOrdering,
} from "../controllers/listening.controller.js";
import upload from "../utils/upload.js";
import { auth } from "../middlewares/auth.js";

const router = Router();

router.get("/", getListeningByLevel);                    // GET /api/listening?level=N5&exerciseType=multiple_choice
router.get("/review", auth(true), getListeningReview);   // GET /api/listening/review?level=N5
router.get("/progress", auth(false), getProgress);      // GET /api/listening/progress?level=N5
router.post("/attempt", auth(false), recordAttempt);    // POST /api/listening/attempt
router.post("/check-dictation", auth(false), checkDictation);  // POST /api/listening/check-dictation
router.post("/check-sentence-ordering", auth(false), checkSentenceOrdering);  // POST /api/listening/check-sentence-ordering
router.get("/:id", getListeningDetail);                // GET /api/listening/123
router.post("/upload", upload.single("audio"), uploadAudio);  // POST /api/listening/upload
router.post("/generate-audio", generateAudio);  // POST /api/listening/generate-audio
router.post("/generate-audio-batch", generateAudioBatch);  // POST /api/listening/generate-audio-batch
router.delete("/audio/:filename", deleteAudio);  // DELETE /api/listening/audio/:filename

export default router;

