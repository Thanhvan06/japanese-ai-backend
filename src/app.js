import path from "path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import diaryRoutes from "./routes/diary.routes.js";
import { errorHandler } from "./middlewares/error.js";

dotenv.config();
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*", credentials: true }));

app.get("/", (req, res) => res.json({ ok: true, service: "japanese-ai-backend" }));
app.use("/api/auth", authRoutes);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/static", express.static(path.join(process.cwd(), "public")));
app.use("/api/diaries", diaryRoutes);

app.use(errorHandler);
export default app;
