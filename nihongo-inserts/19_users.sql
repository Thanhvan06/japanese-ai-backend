-- ==========================================================================
-- Tài khoản người dùng (bảng users): email, hash mật khẩu, tên hiển thị, role, JLPT.
-- Cần có trước nhiều bảng con (nhật ký, todo, fcsets, ...).
-- Bảng: users. Phụ thuộc: không.
-- ==========================================================================

--
-- Đang đổ dữ liệu cho bảng `users`
--

INSERT INTO `users` (`user_id`, `email`, `password_hash`, `display_name`, `avatar_url`, `jlpt_level`, `is_active`, `last_login`, `created_at`, `reset_token`, `reset_token_expires`, `role`) VALUES
(1, 'admin@example.com', '$2b$10$ZOxD19OxkVc/Ji5N1imgi./0KY4w79CyLLw7xc8LAki0Ki/DcewHC', 'Admin', NULL, NULL, 1, '2026-01-08 08:43:16', '2025-12-27 01:46:17', NULL, NULL, 'admin'),
(2, 'thanhvan@gmail.com', '$2b$10$tEpG083dcbDZlv.0m8UR0.0dLJfI6nsnrqyIOsbQzD0bPeeS6doZO', 'Thanh Van', NULL, NULL, 1, '2025-12-27 02:09:10', '2025-12-27 01:49:02', NULL, NULL, 'user'),
(5, 'sawwsa12@gmail.com', '$2b$10$KWtIFL/S5KUDTsX4K0sPpu38OiFj8E4e.KNPLdqkxt5V0KjXSevce', 'sonhyww', NULL, NULL, 1, '2025-12-11 09:19:00', '2025-12-11 09:18:55', NULL, NULL, 'user'),
(6, 'mai@gmail.com', '$2b$10$8ptyyHOeFcwTLp16xzGkcOtH.maijo3tubjQoY5zbj3KdhPaH49Fm', 'dan', NULL, NULL, 1, '2026-01-08 11:00:42', '2025-12-11 10:24:44', NULL, NULL, 'user'),
(7, 'mainguyen2913@gmail.com', '$2b$10$z0VTiDHkFMIsHM1.yn1ewOGv2eXXSIQABaf3EsvBx2MEoZ8N2eTs2', 'mai', NULL, NULL, 1, '2025-12-24 01:46:35', '2025-12-24 00:08:03', '6ddd28c17a44b26c47bfae2fac1ee4de343b45e36d0a432fddf8b70a7198d2f0', '2025-12-24 09:55:53', 'user');
