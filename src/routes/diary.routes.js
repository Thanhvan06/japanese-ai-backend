import { Router } from "express";
import { auth } from "../middlewares/auth.js"; // ✅ bạn dùng 'auth', không phải requireAuth
import { uploadDiaryImages } from "../middlewares/upload.js"; 
import { createDiary, listDiaries, getDiary, updateDiary, deleteDiary, checkGrammarDiary } from "../controllers/diary.controller.js";

const router = Router();

router.post("/", auth(true), uploadDiaryImages.array("images", 20), createDiary);
router.post("/check-grammar", auth(true), checkGrammarDiary);
router.get("/", auth(true), listDiaries);
router.get("/:id", auth(true), getDiary);
router.put("/:id", auth(true), uploadDiaryImages.array("images", 20), updateDiary);
router.delete("/:id", auth(true), deleteDiary);

export default router;
