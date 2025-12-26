import path from "path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.routes.js";
import diaryRoutes from "./routes/diary.routes.js";
import vocabRoutes from "./routes/vocab.routes.js";
import topicRoutes from "./routes/topics.routes.js";
import grammarRoutes from "./routes/grammar.routes.js";
import searchRoutes from "./routes/search.routes.js";

// import chatRoutes from "./routes/chat.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import { errorHandler } from "./middlewares/error.js";
import flashcardRoutes from "./routes/flashcard.routes.js";
import personalRoomRoutes from "./routes/personalRoom.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*", credentials: true }));
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
// app.use("/api/chat", chatRoutes);
app.use("/api", searchRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/personal-room", personalRoomRoutes);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/static", express.static(path.join(process.cwd(), "public")));
app.use("/api/diaries", diaryRoutes);

app.use(errorHandler);

export default app;
