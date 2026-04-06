-- ==========================================================================
-- Kế hoạch học (bảng study_plans): khoảng ngày, mục tiêu JLPT, số từ mỗi ngày.
-- Bảng: study_plans. Phụ thuộc: user_id trong users.
-- ==========================================================================

--
-- Đang đổ dữ liệu cho bảng `study_plans`
--

INSERT INTO `study_plans` (`plan_id`, `user_id`, `start_date`, `end_date`, `target_level`, `words_per_day`, `created_at`) VALUES
(5, 6, '2025-12-23', '2025-12-26', 'N5', 28, '2025-12-23 23:37:16');
