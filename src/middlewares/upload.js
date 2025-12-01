import multer from "multer";
import path from "path";
import fs from "fs";

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

const makeStorage = (subDir) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads", subDir);
    ensureDir(dir); cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "image", ext).replace(/\s+/g, "_");
    cb(null, `${base}_${Date.now()}${ext || ".png"}`);
  }
});

export const uploadCover = multer({ storage: makeStorage("diary_covers") });
export const uploadImage = multer({ storage: makeStorage("diary_images") });
export const uploadDiaryImages = multer({ 
  storage: makeStorage("diary_images"),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per file
});
