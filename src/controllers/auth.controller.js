import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../prisma.js";
import { sendPasswordResetEmail } from "../services/email.service.js";

// ----- Schemas -----
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
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
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự")
});

// Ẩn trường nhạy cảm
function toPublicUser(u) {
  return {
    user_id: u.user_id,
    email: u.email,
    display_name: u.display_name,
    avatar_url: u.avatar_url ?? null,
    jlpt_level: u.jlpt_level ?? null,
    is_active: u.is_active,
    created_at: u.created_at
  };
}

export const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // email unique
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
        display_name: data.displayName,     // NOT NULL trong DB
        is_active: true
      }
    });

    // có thể auto đăng nhập sau khi đăng ký
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ user: toPublicUser(user), token });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.users.findUnique({
      where: { email: data.email }
    });
    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    if (user.is_active === false) {
      return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hóa" });
    }

    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }

    // cập nhật last_login 
    await prisma.users.update({
      where: { user_id: user.user_id },
      data: { last_login: new Date() }
    });

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ user: toPublicUser(user), token });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    // req.user được gắn ở middleware auth
    const u = await prisma.users.findUnique({
      where: { user_id: req.user.user_id }
    });
    if (!u) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.json({ user: toPublicUser(u) });
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

    // Không tiết lộ nếu email không tồn tại (bảo mật)
    if (!user) {
      return res.json({ 
        message: "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu" 
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hóa" });
    }

    // Tạo reset token (random string)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 giờ

    // Lưu token vào DB
    await prisma.users.update({
      where: { user_id: user.user_id },
      data: {
        reset_token: resetToken,
        reset_token_expires: resetTokenExpires
      }
    });

    // Gửi email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.display_name);
      res.json({ 
        message: "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu" 
      });
    } catch (emailError) {
      // Nếu gửi email thất bại, xóa token
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

    // Tìm user với token hợp lệ
    const user = await prisma.users.findFirst({
      where: {
        reset_token: data.token,
        reset_token_expires: {
          gt: new Date() // Token chưa hết hạn
        }
      }
    });

    if (!user) {
      return res.status(400).json({ 
        message: "Token không hợp lệ hoặc đã hết hạn" 
      });
    }

    // Hash password mới
    const hash = await bcrypt.hash(data.password, 10);

    // Cập nhật password và xóa reset token
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
