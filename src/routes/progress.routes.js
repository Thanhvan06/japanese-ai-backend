import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { getMyPracticeProgress } from "../controllers/userProgress.controller.js";

const router = Router();

router.get("/me", auth(true), getMyPracticeProgress);

export default router;
