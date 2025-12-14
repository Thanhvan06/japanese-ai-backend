import express from "express";
import { searchAll } from "../controllers/search.controller.js";

const router = express.Router();

// GET /api/search?q=...&type=all|vocab|grammar
router.get("/search", searchAll);

export default router;
