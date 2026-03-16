import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.routes.js";
import vocabRoutes from "./routes/vocab.routes.js";
import topicRoutes from "./routes/topics.routes.js";
import grammarRoutes from "./routes/grammar.routes.js";
import listeningRoutes from "./routes/listening.routes.js";
import readingRoutes from "./routes/reading.routes.js";
import speakingRoutes from "./routes/speaking.routes.js";
import searchRoutes from "./routes/search.routes.js";
import studyRoutes from "./routes/study.routes.js";

// import chatRoutes from "./routes/chat.routes.js";
import { errorHandler } from "./middlewares/error.js";

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonParser = express.json();

app.use((req, res, next) => {
  if (req.path === "/api/speaking/practice") {
    return next();
  }
  return jsonParser(req, res, next);
});

// Serve static files (audio files)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(cors());

// TEST route
app.get("/", (req, res) =>
  res.json({ ok: true, service: "japanese-ai-backend" })
);

app.use("/api/auth", authRoutes);
app.use("/api/vocab", vocabRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/grammar", grammarRoutes);
app.use("/api/listening", listeningRoutes);
app.use("/api/reading", readingRoutes);
// app.use("/api/chat", chatRoutes);
app.use("/api/speaking", speakingRoutes);
app.use("/api", searchRoutes);
app.use("/api/study", studyRoutes);

app.use(errorHandler);

export default app;
