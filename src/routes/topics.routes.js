// src/routes/topics.routes.js
import express from "express";
import { getTopics, getTopicVocab } from "../controllers/topics.controller.js";

const router = express.Router();

router.get("/", getTopics);               // /api/topics?level=N5
router.get("/:topicId/vocab", getTopicVocab); // /api/topics/1/vocab

export default router;
