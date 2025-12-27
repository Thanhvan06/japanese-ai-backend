import { Router } from "express";
import { auth } from "../middlewares/auth.js"; // ✅ bạn dùng 'auth', không phải requireAuth
import { uploadDiaryImages } from "../middlewares/upload.js"; 
import { createDiary, listDiaries, getDiary, updateDiary, deleteDiary, checkGrammarDiary } from "../controllers/diary.controller.js";

const router = Router();

// Wrapper to handle multer errors
const handleMulterErrors = (multerMiddleware) => {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        // Multer errors are passed to error handler
        return next(err);
      }
      next();
    });
  };
};

router.post("/", auth(true), handleMulterErrors(uploadDiaryImages.array("images", 20)), createDiary);
router.post("/check-grammar", auth(true), checkGrammarDiary);
router.get("/", auth(true), listDiaries);
router.get("/:id", auth(true), getDiary);
router.put("/:id", auth(true), handleMulterErrors(uploadDiaryImages.array("images", 20)), updateDiary);
router.delete("/:id", auth(true), deleteDiary);

export default router;
