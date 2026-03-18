import { Router } from "express";
import {
  getReadingByLevel,
  getReadingDetail,
  recordAttempt,
  checkFillInTheBlank,
  getProgress,
} from "../controllers/reading.controller.js";
import { auth } from "../middlewares/auth.js";

const router = Router();

router.get("/", getReadingByLevel);                    // GET /api/reading?level=N5&exerciseType=reading_comprehension
router.get("/progress", auth(false), getProgress);      // GET /api/reading/progress?level=N5
router.post("/attempt", auth(false), recordAttempt);   // POST /api/reading/attempt
router.post("/check-fill-in-the-blank", auth(false), checkFillInTheBlank);  // POST /api/reading/check-fill-in-the-blank
router.get("/:id", getReadingDetail);                  // GET /api/reading/123

export default router;

