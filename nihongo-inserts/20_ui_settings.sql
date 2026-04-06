-- ==========================================================================
-- Cài đặt giao diện / todo / playlist (bảng user_settings): JSON theme, todo, nhạc.
-- Bảng: user_settings. Phụ thuộc: user_id trong users.
-- ==========================================================================

--
-- Đang đổ dữ liệu cho bảng `user_settings`
--

INSERT INTO `user_settings` (`user_id`, `theme_config`, `todo_config`, `playlist_config`, `created_at`, `updated_at`) VALUES
(1, '{}', '{}', '{\"playlist\": [], \"flashcard_rounds\": {}}', '2025-12-27 09:45:08', '2025-12-27 09:45:08'),
(6, '{\"color\": \"#14b8a6\", \"image\": \"https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800\"}', '{}', '{\"playlist\": [{\"id\": \"user-1766515054946\", \"title\": \"YouTube: ci1Chj8-0eo\", \"artist\": \"Custom\", \"isSystem\": false, \"youtubeId\": \"ci1Chj8-0eo\"}], \"flashcard_rounds\": {}}', '2025-12-23 07:46:03', '2026-01-08 18:08:29'),
(7, '{\"color\": \"#ef4444\", \"image\": \"https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=800\"}', '{}', '{\"playlist\": [], \"flashcard_rounds\": {}}', '2025-12-24 00:08:19', '2025-12-24 08:31:59');
