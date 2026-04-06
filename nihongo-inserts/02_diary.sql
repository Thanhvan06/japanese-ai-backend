-- ==========================================================================
-- Nhật ký học tập (bảng diaryentries): bài viết tiếng Nhật của học viên,
-- tiêu đề, nội dung, ảnh đính kèm, kết quả phân tích NLP/furigana (JSON).
-- Phục vụ tính năng nhật ký và chấm điểm văn bản trong ứng dụng.
-- Bảng: diaryentries. Phụ thuộc: user_id tồn tại trong users.
-- ==========================================================================

--
-- Đang đổ dữ liệu cho bảng `diaryentries`
--

INSERT INTO `diaryentries` (`diary_id`, `user_id`, `title`, `content_jp`, `image_url`, `images`, `nlp_analysis`, `created_at`, `updated_at`) VALUES
(4, 6, 'あなた', '昨日、私は映画を見ました。私は学生です。姉は先生ではありません。', NULL, NULL, '{\"corrected\":\"昨日、私は映画を見ました。私は学生です。姉は先生ではありません。\",\"notes\":[],\"furigana\":[{\"surface\":\"昨日\",\"reading\":\"キノウ\"},{\"surface\":\"、\",\"reading\":\"、\"},{\"surface\":\"私\",\"reading\":\"ワタシ\"},{\"surface\":\"は\",\"reading\":\"ハ\"},{\"surface\":\"映画\",\"reading\":\"エイガ\"},{\"surface\":\"を\",\"reading\":\"ヲ\"},{\"surface\":\"見\",\"reading\":\"ミ\"},{\"surface\":\"まし\",\"reading\":\"マシ\"},{\"surface\":\"た\",\"reading\":\"タ\"},{\"surface\":\"。\",\"reading\":\"。\"},{\"surface\":\"私\",\"reading\":\"ワタシ\"},{\"surface\":\"は\",\"reading\":\"ハ\"},{\"surface\":\"学生\",\"reading\":\"ガクセイ\"},{\"surface\":\"です\",\"reading\":\"デス\"},{\"surface\":\"。\",\"reading\":\"。\"},{\"surface\":\"姉\",\"reading\":\"アネ\"},{\"surface\":\"は\",\"reading\":\"ハ\"},{\"surface\":\"先生\",\"reading\":\"センセイ\"},{\"surface\":\"で\",\"reading\":\"デ\"},{\"surface\":\"は\",\"reading\":\"ハ\"},{\"surface\":\"あり\",\"reading\":\"アリ\"},{\"surface\":\"ませ\",\"reading\":\"マセ\"},{\"surface\":\"ん\",\"reading\":\"ン\"},{\"surface\":\"。\",\"reading\":\"。\"}]}', '2025-12-22 11:16:30', '2025-12-22 11:16:30'),
(5, 6, 'おめでとうございます', 'じゃないですか', '/uploads/diary_images/Screenshot_2025-12-14_170343_1766763896926.png', '[\"/uploads/diary_images/Screenshot_2025-12-14_170343_1766763896926.png\"]', '{\"corrected\":\"じゃないですか\",\"notes\":[],\"furigana\":[{\"surface\":\"じゃ\",\"reading\":\"ジャ\"},{\"surface\":\"ない\",\"reading\":\"ナイ\"},{\"surface\":\"です\",\"reading\":\"デス\"},{\"surface\":\"か\",\"reading\":\"カ\"}]}', '2025-12-26 08:43:09', '2025-12-26 08:43:09');
