import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

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
  limits: { fileSize: 10 * 1024 * 1024 } 
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "flashcard-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)"));
  }
});

export const uploadSingle = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File ảnh quá lớn (tối đa 10MB)" });
      }
      return res.status(400).json({ message: err.message });
    }
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

