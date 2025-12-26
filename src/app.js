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
import adminRoutes from "./routes/admin.routes.js";
import { errorHandler } from "./middlewares/error.js";

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS configuration - must be BEFORE all other middleware
// Use cors middleware with proper configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        process.env.CLIENT_ORIGIN || "http://localhost:5173"];
      
      if (allowedOrigins.indexOf(origin) !== -1 || origin.includes("localhost") || origin.includes("127.0.0.1")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    exposedHeaders: ["Content-Type", "Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.use(express.json());

// Serve static files (audio files)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

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
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

export default app;