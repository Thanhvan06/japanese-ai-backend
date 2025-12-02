import express from "express";
import {
  createSession,
  getSessionsByUser,
  getMessagesBySession,
  sendMessage,
  deleteSession,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.post("/sessions", createSession);
router.get("/sessions", getSessionsByUser);
router.get("/messages/:session_id", getMessagesBySession);
router.post("/send", sendMessage);
router.delete("/sessions/:session_id", deleteSession);

export default router;
