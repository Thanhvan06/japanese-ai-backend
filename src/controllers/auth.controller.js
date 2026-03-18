import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z, ZodError } from "zod";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { sendPasswordResetEmail } from "../services/email.service.js";
import { getPersonalRoomStateForUser } from "./personalRoom.controller.js";

// ----- Schemas -----
const passwordSchema = z
  .string()
  .min(6, "Mật khẩu tối thiểu 6 ký tự")
  .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ thường")
  .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ hoa")
  .regex(/[^A-Za-z0-9]/, "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt");

const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  displayName: z.string().min(1, "Vui lòng nhập tên hiển thị")
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema
});

// Ẩn trường nhạy cảm
function toPublicUser(u) {
  return {
    user_id: u.user_id,
    email: u.email,
    display_name: u.display_name,
    avatar_url: u.avatar_url ?? null,
    role: u.role ?? "user",
    is_active: u.is_active,
    created_at: u.created_at
  };
}

export const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const exists = await prisma.users.findUnique({
      where: { email: data.email }
    });
    if (exists) {
      return res.status(409).json({ message: "Email đã được đăng ký" });
    }

    const hash = await bcrypt.hash(data.password, 10);

    const user = await prisma.users.create({
      data: {
        email: data.email,
        password_hash: hash,
        display_name: data.displayName,    
        is_active: true
      }
    });

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role ?? "user" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ user: toPublicUser(user), token });
  } catch (err) {
    if (err instanceof ZodError) {
      // Trả về lỗi validation chi tiết
      return res.status(400).json({
        message: "Validation failed",
        errors: err.errors.map((e) => ({
          path: e.path,
          message: e.message,
          validation: e.validation,
          code: e.code
        }))
      });
    }
    next(err);
  }
};

// --------- Các API còn lại giữ nguyên ---------
export const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.users.findUnique({
      where: { email: data.email }
    });
    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên." });
    }

    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    await prisma.users.update({
      where: { user_id: user.user_id },
      data: { last_login: new Date() }
    });

    const adminRec = await prisma.admins.findUnique({
      where: { user_id: user.user_id }
    });

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role ?? "user" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    const personal_room = await getPersonalRoomStateForUser(user.user_id);

    const publicUser = toPublicUser(user);
    if (adminRec) {
      publicUser.adminRole = adminRec.role;
    }

    res.json({ user: publicUser, token });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const u = await prisma.users.findUnique({
      where: { user_id: req.user.user_id }
    });
    if (!u) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    
    const adminRec = await prisma.admins.findUnique({
      where: { user_id: u.user_id }
    });
    
    const publicUser = toPublicUser(u);
    if (adminRec) {
      publicUser.adminRole = adminRec.role;
    }
    
    const personal_room = await getPersonalRoomStateForUser(u.user_id);
    res.json({ user: publicUser, personal_room });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);

    const user = await prisma.users.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      return res.json({ 
        message: "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu" 
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hóa" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000);

    await prisma.users.update({
      where: { user_id: user.user_id },
      data: {
        reset_token: resetToken,
        reset_token_expires: resetTokenExpires
      }
    });

    try {
      await sendPasswordResetEmail(user.email, resetToken, user.display_name);
      res.json({ 
        message: "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu" 
      });
    } catch (emailError) {
      await prisma.users.update({
        where: { user_id: user.user_id },
        data: {
          reset_token: null,
          reset_token_expires: null
        }
      });
      throw emailError;
    }
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    const user = await prisma.users.findFirst({
      where: {
        reset_token: data.token,
        reset_token_expires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({ 
        message: "Token không hợp lệ hoặc đã hết hạn" 
      });
    }

    const hash = await bcrypt.hash(data.password, 10);

    await prisma.users.update({
      where: { user_id: user.user_id },
      data: {
        password_hash: hash,
        reset_token: null,
        reset_token_expires: null
      }
    });

    res.json({ message: "Đặt lại mật khẩu thành công" });
  } catch (err) {
    next(err);
  }
};
