import { Router } from "express";
import { getVocabByLevel } from "../controllers/vocab.controller.js";

const router = Router();

router.get("/", getVocabByLevel);     // GET /api/vocab?level=N5

export default router;
