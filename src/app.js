import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import flashcardRoutes from "./routes/flashcard.routes.js";
import { errorHandler } from "./middlewares/error.js";

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*", credentials: true }));

app.get("/", (req, res) => res.json({ ok: true, service: "japanese-ai-backend" }));
app.use("/api/auth", authRoutes);
app.use("/api/flashcards", flashcardRoutes);

app.use(errorHandler);
export default app;
