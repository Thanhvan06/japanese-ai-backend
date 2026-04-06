-- ============================================================================
-- Nguồn: japanese-ai-backend/scripts/seed-admin.js (file .js giữ nguyên để đối chiếu).
-- Mục đích: tạo tài khoản quản trị đầu tiên (users.role = admin + dòng admins).
-- Mặc định: email admin@example.com, mật khẩu Admin@123 (bcrypt 10 rounds,
-- tương thích bcryptjs). Script JS còn hỗ trợ ADMIN_EMAIL, ADMIN_PASSWORD,
-- ADMIN_RESET_PASSWORD; bản SQL chỉ cố định một cặp hash/email như trên.
-- Điều kiện: bảng users, admins đã tồn tại theo schema Prisma.
-- Idempotent: bỏ qua nếu email đã có; admins chỉ thêm khi user chưa có dòng admins.
-- ============================================================================

INSERT INTO `users` (`email`, `password_hash`, `display_name`, `role`, `is_active`)
SELECT 'admin@example.com', '$2b$10$IvB3kEviMYt/tV/iXTSfWuAr4eXxEdeIX3SOVaofF52ll4uXaKbHm', 'Administrator', 'admin', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `users` u WHERE u.`email` = 'admin@example.com');

INSERT INTO `admins` (`user_id`, `role`, `assigned_by`)
SELECT u.`user_id`, 'content_manager', u.`user_id`
FROM `users` u
WHERE u.`email` = 'admin@example.com'
  AND NOT EXISTS (SELECT 1 FROM `admins` a WHERE a.`user_id` = u.`user_id`);
