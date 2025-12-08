import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { uploadSingle } from "../middlewares/upload.js";
import {
  // Folders
  getFolders,
  createFolder,
  deleteFolder,
  // Sets
  getSets,
  getSetById,
  createSet,
  updateSet,
  deleteSet,
  // Cards
  getCards,
  createCard,
  updateCard,
  deleteCard,
  // Study
  startStudy,
  getCardAnswer,
  submitStudyAnswer,
  getStudyStats
} from "../controllers/flashcard.controller.js";

const r = Router();

// Tất cả routes đều yêu cầu authentication
r.use(auth(true));

// ----- Folder Routes -----
r.get("/folders", getFolders);
r.post("/folders", createFolder);
r.delete("/folders/:folderId", deleteFolder);

// ----- Set Routes -----
r.get("/sets", getSets); // Có thể query ?folderId=123
r.get("/sets/:setId", getSetById);
r.post("/sets", createSet);
r.put("/sets/:setId", updateSet);
r.delete("/sets/:setId", deleteSet);

// ----- Card Routes -----
r.get("/sets/:setId/cards", getCards);
r.post("/sets/:setId/cards", uploadSingle, createCard);
r.put("/sets/:setId/cards/:cardId", uploadSingle, updateCard);
r.delete("/sets/:setId/cards/:cardId", deleteCard);

// ----- Study Routes -----
r.get("/sets/:setId/study", startStudy); // Có thể query ?mode=all|not-mastered|mastered
r.get("/sets/:setId/study/cards/:cardId/answer", getCardAnswer);
r.post("/sets/:setId/study/answer", submitStudyAnswer);
r.get("/sets/:setId/stats", getStudyStats);

export default r;

