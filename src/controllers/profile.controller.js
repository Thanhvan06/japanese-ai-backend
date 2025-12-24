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

const studyPlanSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
  target_level: z.enum(["N5", "N4", "N3", "N2", "N1"]),
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

export const createStudyPlan = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const payload = studyPlanSchema.parse(req.body);

    const startDate = new Date(payload.start_date);
    const endDate = new Date(payload.end_date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: "Ngày bắt đầu/kết thúc không hợp lệ" });
    }
    if (startDate > endDate) {
      return res.status(400).json({ message: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc" });
    }

    const totalVocab = await prisma.vocabitems.count({
      where: { jlpt_level: payload.target_level, is_published: true },
    });

    const dayCount =
      Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const wordsPerDay =
      dayCount > 0
        ? (totalVocab === 0 ? 0 : Math.ceil(totalVocab / dayCount))
        : 0;

    const existingPlans = await prisma.study_plans.findMany({
      where: { user_id: userId },
      select: { plan_id: true },
    });

    await prisma.$transaction(async (tx) => {
      if (existingPlans.length > 0) {
        const planIds = existingPlans.map((p) => p.plan_id);
        await tx.study_plan_items.deleteMany({ where: { plan_id: { in: planIds } } });
        await tx.study_plans.deleteMany({ where: { plan_id: { in: planIds } } });
      }
    });

    const plan = await prisma.study_plans.create({
      data: {
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
        target_level: payload.target_level,
        words_per_day: wordsPerDay,
      },
    });

    const base = dayCount > 0 ? Math.floor(totalVocab / dayCount) : 0;
    let remainder = dayCount > 0 ? totalVocab % dayCount : 0;
    const itemsData = [];
    for (let i = 0; i < dayCount; i += 1) {
      const studyDate = new Date(startDate);
      studyDate.setDate(startDate.getDate() + i);
      const dailyCount = wordsPerDay === 0 ? 0 : base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      itemsData.push({
        plan_id: plan.plan_id,
        study_date: studyDate,
        required_vocab_count: dailyCount,
      });
    }

    const items = await prisma.$transaction(async (tx) => {
      if (itemsData.length === 0) return [];
      return tx.study_plan_items.createMany({
        data: itemsData,
      }).then(() => itemsData);
    });

    // Auto-generate flashcard sets for each day's vocab
    const generatedSets = [];
    if (items.length > 0 && totalVocab > 0) {
      // Get all vocab items for the target level
      const allVocabItems = await prisma.vocabitems.findMany({
        where: {
          jlpt_level: payload.target_level,
          is_published: true,
        },
        orderBy: { vocab_id: "asc" },
      });

      if (allVocabItems.length > 0) {
        let vocabIndex = 0;
        for (let i = 0; i < items.length; i += 1) {
          const item = items[i];
          const requiredCount = item.required_vocab_count || 0;
          
          if (requiredCount > 0 && vocabIndex < allVocabItems.length) {
            // Get vocab items for this day
            const dayVocab = allVocabItems.slice(vocabIndex, vocabIndex + requiredCount);
            vocabIndex += requiredCount;

            if (dayVocab.length > 0) {
              // Format date for set name
              const studyDate = new Date(item.study_date);
              const dateStr = studyDate.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });

              // Create flashcard set
              const flashcardSet = await prisma.fcsets.create({
                data: {
                  user_id: userId,
                  set_name: `Kế hoạch học ${payload.target_level} - Ngày ${i + 1} (${dateStr})`,
                  folder_id: null,
                },
              });

              // Create cards from vocab items
              await prisma.fccards.createMany({
                data: dayVocab.map((vocab) => ({
                  set_id: flashcardSet.set_id,
                  side_jp: vocab.word,
                  side_viet: vocab.meaning,
                  image_url: vocab.image_url || null,
                  mastery_level: 1,
                })),
              });

              generatedSets.push({
                set_id: flashcardSet.set_id,
                set_name: flashcardSet.set_name,
                card_count: dayVocab.length,
                study_date: item.study_date,
              });
            }
          }
        }
      }
    }

    res.status(201).json({
      plan: {
        plan_id: plan.plan_id,
        start_date: plan.start_date,
        end_date: plan.end_date,
        target_level: plan.target_level,
        words_per_day: wordsPerDay,
        total_vocab: totalVocab,
      },
      items: items ?? [],
      generated_sets: generatedSets,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    next(err);
  }
};

