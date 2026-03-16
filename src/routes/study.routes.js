import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  createStudySession,
  getStudyProgress,
  updateStudySettings,
} from "../controllers/study.controller.js";

const router = Router();

router.post("/sessions", auth(true), createStudySession);
router.get("/progress", auth(true), getStudyProgress);
router.put("/settings", auth(true), updateStudySettings);

export default router;

