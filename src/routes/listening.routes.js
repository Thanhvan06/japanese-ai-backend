import { Router } from "express";
import {
  getListeningByLevel,
  getListeningDetail,
  uploadAudio,
  deleteAudio,
  generateAudio,
  generateAudioBatch,
} from "../controllers/listening.controller.js";
import upload from "../utils/upload.js";

const router = Router();

router.get("/", getListeningByLevel);      // GET /api/listening?level=N5
router.get("/:id", getListeningDetail);    // GET /api/listening/123
router.post("/upload", upload.single("audio"), uploadAudio);  // POST /api/listening/upload
router.post("/generate-audio", generateAudio);  // POST /api/listening/generate-audio
router.post("/generate-audio-batch", generateAudioBatch);  // POST /api/listening/generate-audio-batch
router.delete("/audio/:filename", deleteAudio);  // DELETE /api/listening/audio/:filename

export default router;

