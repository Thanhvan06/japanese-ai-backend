import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.routes.js";
import vocabRoutes from "./routes/vocab.routes.js";
import grammarRoutes from "./routes/grammar.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import { errorHandler } from "./middlewares/error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
// Serve static files from uploads directory
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
app.use("/api/grammar", grammarRoutes);
app.use("/api/profile", profileRoutes);

app.use(errorHandler);

export default app;
