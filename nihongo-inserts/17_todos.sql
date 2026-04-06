-- ==========================================================================
-- Việc cần làm (bảng todos): tiêu đề, thời lượng dự kiến, trạng thái.
-- Bảng: todos. Phụ thuộc: user_id trong users.
-- ==========================================================================

--
-- Đang đổ dữ liệu cho bảng `todos`
--

INSERT INTO `todos` (`todo_id`, `user_id`, `title`, `expected_duration`, `status`, `created_at`) VALUES
(1, 6, 'hhh', NULL, 'pending', '2025-12-23 08:22:06'),
(2, 6, ',n,', NULL, 'pending', '2025-12-23 09:09:02');
