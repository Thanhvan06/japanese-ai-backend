-- ============================================================================
-- Nguồn: japanese-ai-backend/scripts/seed-speaking-phrases.js (file .js giữ nguyên để đối chiếu).
-- Mục đích: bảng speaking_phrases — cụm tiếng Nhật luyện nói/thu âm theo chủ đề.
-- Dữ liệu: 10 cụm x 5 cấp JLPT (N5..N1), is_published = 1, audio_url NULL.
-- Đã rút gọn để tránh lặp literal: phrase gốc + cross join level.
-- Idempotent: không chèn nếu đã tồn tại cùng (jp, jlpt_level).
-- ============================================================================

INSERT INTO `speaking_phrases` (
  `jp`, `romaji`, `vi`, `topic`, `jlpt_level`,
  `is_published`, `audio_url`, `created_at`
)
SELECT
  p.jp,
  p.romaji,
  p.vi,
  p.topic,
  l.jlpt_level,
  1 AS is_published,
  NULL AS audio_url,
  CURRENT_TIMESTAMP AS created_at
FROM (
  SELECT '今日はいい天気ですね。' AS jp, 'Kyou wa ii tenki desu ne.' AS romaji, 'Hôm nay trời đẹp nhỉ.' AS vi, 'Chào hỏi' AS topic
  UNION ALL SELECT 'すみません、もう一度お願いします。', 'Sumimasen, mou ichido onegaishimasu.', 'Xin lỗi, làm ơn nhắc lại một lần nữa.', 'Giao tiếp'
  UNION ALL SELECT '駅までの行き方を教えてください。', 'Eki made no ikikata wo oshiete kudasai.', 'Làm ơn chỉ giúp đường đến ga.', 'Hỏi đường'
  UNION ALL SELECT 'おはようございます。', 'Ohayou gozaimasu.', 'Chào buổi sáng.', 'Chào hỏi'
  UNION ALL SELECT 'ありがとうございます。', 'Arigatou gozaimasu.', 'Cảm ơn bạn.', 'Giao tiếp'
  UNION ALL SELECT 'お元気ですか？', 'Ogenki desu ka?', 'Bạn khỏe không?', 'Chào hỏi'
  UNION ALL SELECT '私は学生です。', 'Watashi wa gakusei desu.', 'Tôi là học sinh.', 'Giới thiệu'
  UNION ALL SELECT 'これは何ですか？', 'Kore wa nan desu ka?', 'Đây là cái gì?', 'Hỏi đáp'
  UNION ALL SELECT 'いくらですか？', 'Ikura desu ka?', 'Bao nhiêu tiền?', 'Mua sắm'
  UNION ALL SELECT 'お願いします。', 'Onegaishimasu.', 'Làm ơn.', 'Giao tiếp'
) AS p
CROSS JOIN (
  SELECT 'N5' AS jlpt_level
  UNION ALL SELECT 'N4'
  UNION ALL SELECT 'N3'
  UNION ALL SELECT 'N2'
  UNION ALL SELECT 'N1'
) AS l
WHERE NOT EXISTS (
  SELECT 1
  FROM `speaking_phrases` x
  WHERE x.`jp` <=> p.jp
    AND x.`jlpt_level` <=> l.jlpt_level
);
