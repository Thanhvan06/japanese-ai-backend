import { Router } from "express";
import { auth } from "../middlewares/auth.js"; // ✅ bạn dùng 'auth', không phải requireAuth
import { uploadCover } from "../middlewares/upload.js"; 
import { createDiary, listDiaries, getDiary, updateDiary, deleteDiary } from "../controllers/diary.controller.js";

const router = Router();

router.post("/", auth(true), uploadCover.single("cover"), createDiary);
router.get("/", auth(true), listDiaries);
router.get("/:id", auth(true), getDiary);
router.put("/:id", auth(true), uploadCover.single("cover"), updateDiary);
router.delete("/:id", auth(true), deleteDiary);

export default router;
