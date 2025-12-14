import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tạo thư mục uploads nếu chưa có
const uploadsDir = path.join(__dirname, "../../uploads/avatars");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cấu hình multer để lưu file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép upload file ảnh (jpeg, jpg, png, gif, webp)"));
    }
  },
}).single("avatar");

// Middleware để xử lý upload
export const uploadAvatar = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// Schema validation
const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Tên hiển thị không được để trống").optional(),
  oldPassword: z.string().optional(),
  newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự").optional(),
}).refine((data) => {
  // Nếu có newPassword thì phải có oldPassword
  if (data.newPassword && data.newPassword.trim() !== "") {
    return data.oldPassword && data.oldPassword.trim() !== "";
  }
  return true;
}, {
  message: "Phải nhập mật khẩu cũ để đổi mật khẩu",
  path: ["oldPassword"],
});

// Ẩn trường nhạy cảm (giống auth.controller)
function toPublicUser(u) {
  return {
    user_id: u.user_id,
    email: u.email,
    display_name: u.display_name,
    avatar_url: u.avatar_url ?? null,
    jlpt_level: u.jlpt_level ?? null,
    is_active: u.is_active,
    created_at: u.created_at,
  };
}

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // Lấy user hiện tại
    const currentUser = await prisma.users.findUnique({
      where: { user_id: userId },
    });

    if (!currentUser) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Parse body (multer đã parse form-data)
    const body = req.body;
    
    // Chỉ validate password nếu có gửi lên
    const dataToValidate = {
      displayName: body.displayName,
    };
    if (body.oldPassword !== undefined) {
      dataToValidate.oldPassword = body.oldPassword;
    }
    if (body.newPassword !== undefined) {
      dataToValidate.newPassword = body.newPassword;
    }
    
    const validatedData = updateProfileSchema.parse(dataToValidate);

    // Chuẩn bị data để update
    const updateData = {};

    // Cập nhật display_name nếu có
    if (validatedData.displayName) {
      updateData.display_name = validatedData.displayName;
    }

    // Cập nhật password nếu có oldPassword và newPassword
    if (validatedData.oldPassword && validatedData.oldPassword.trim() !== "" &&
        validatedData.newPassword && validatedData.newPassword.trim() !== "") {
      // Kiểm tra mật khẩu cũ có đúng không
      const isOldPasswordCorrect = await bcrypt.compare(
        validatedData.oldPassword,
        currentUser.password_hash
      );
      
      if (!isOldPasswordCorrect) {
        return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
      }
      
      // Hash mật khẩu mới
      updateData.password_hash = await bcrypt.hash(validatedData.newPassword, 10);
    }

    // Xử lý avatar upload
    if (req.file) {
      // Xóa avatar cũ nếu có
      if (currentUser.avatar_url) {
        const oldAvatarPath = path.join(__dirname, "../../", currentUser.avatar_url);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      // Lưu đường dẫn mới (relative từ root của project)
      updateData.avatar_url = `uploads/avatars/${req.file.filename}`;
    }

    // Update user
    const updatedUser = await prisma.users.update({
      where: { user_id: userId },
      data: updateData,
    });

    res.json({ user: toPublicUser(updatedUser), message: "Cập nhật profile thành công" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    next(err);
  }
};

