-- ==========================================================================
-- Bộ flashcard (bảng fcsets): tên bộ, người sở hữu, thư mục tùy chọn.
-- Nhóm các thẻ fccards theo chủ đề hoặc mục tiêu JLPT.
-- Bảng: fcsets. Phụ thuộc: user_id; folder_id có thể null hoặc thuộc fcfolders.
-- ==========================================================================

--
-- Đang đổ dữ liệu cho bảng `fcsets`
--

INSERT INTO `fcsets` (`set_id`, `user_id`, `folder_id`, `set_name`, `created_at`) VALUES
(1, 6, NULL, 'N5 vocab test', '2025-12-23 07:14:06'),
(2, 6, NULL, 'テスト', '2025-12-23 07:14:27');
