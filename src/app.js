import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.routes.js";
import vocabRoutes from "./routes/vocab.routes.js";
import topicRoutes from "./routes/topics.routes.js";
import grammarRoutes from "./routes/grammar.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import listeningRoutes from "./routes/listening.routes.js";
import searchRoutes from "./routes/search.routes.js";
import { errorHandler } from "./middlewares/error.js";

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

// Serve static files (audio files)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// TEST route
app.get("/", (req, res) =>
  res.json({ ok: true, service: "japanese-ai-backend" })
);

app.use("/api/auth", authRoutes);
app.use("/api/vocab", vocabRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/grammar", grammarRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/listening", listeningRoutes);
app.use("/api", searchRoutes);

app.use(errorHandler);

export default app;