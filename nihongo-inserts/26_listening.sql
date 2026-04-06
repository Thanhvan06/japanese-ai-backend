-- ============================================================================
-- Nguồn: japanese-ai-backend/scripts/seed-listening.js (file .js giữ nguyên để đối chiếu).
-- Mục đích: listening_sets + listening_items — nghe hiểu, dictation, sắp xếp câu.
-- Mỗi cấp JLPT: 2 set trắc nghiệm (5 câu/set), 1 dictation (4 câu), 1 sắp xếp (5 câu).
-- Khác JS: bản JS xáo options ngẫu nhiên; SQL giữ thứ tự cố định, đáp án đúng
-- luôn ở index 0 trong options_json (nghĩa giống, thứ tự hiển thị khác).
-- Đã rút gọn để tránh lặp literal theo cấp JLPT và theo set.
-- ============================================================================

INSERT INTO `listening_sets` (`title`, `jlpt_level`, `is_published`)
SELECT t.title, l.jlpt_level, 1
FROM (
  SELECT 'Câu giao tiếp cơ bản' AS title
  UNION ALL SELECT 'Câu thường dùng hàng ngày'
  UNION ALL SELECT 'Luyện nghe viết lại'
  UNION ALL SELECT 'Luyện sắp xếp câu'
) AS t
CROSS JOIN (
  SELECT 'N5' AS jlpt_level
  UNION ALL SELECT 'N4'
  UNION ALL SELECT 'N3'
  UNION ALL SELECT 'N2'
  UNION ALL SELECT 'N1'
) AS l
WHERE NOT EXISTS (
  SELECT 1
  FROM `listening_sets` x
  WHERE x.`title` = t.title
    AND x.`jlpt_level` = l.jlpt_level
);

INSERT INTO `listening_items`
  (`set_id`, `exercise_type`, `audio_url`, `options_json`,
   `question`, `transcript_jp`, `explain_viet`, `correct_index`)
SELECT
  s.`set_id`,
  'multiple_choice',
  m.audio_url,
  m.options_json,
  '会話を聞いて、正しい答えを選んでください。',
  m.transcript_jp,
  m.explain_viet,
  0
FROM `listening_sets` s
JOIN (
  SELECT 'Câu giao tiếp cơ bản' AS title
  UNION ALL SELECT 'Câu thường dùng hàng ngày'
) AS t ON t.title = s.`title`
JOIN (
  SELECT '/uploads/audio/お願いします.mp3' AS audio_url, 'お願いします' AS transcript_jp, 'Làm ơn / Xin vui lòng' AS explain_viet, '["Làm ơn / Xin vui lòng", "Đây là cái gì?", "Xin lỗi, nói lại nhé", "Hôm nay trời đẹp"]' AS options_json
  UNION ALL SELECT '/uploads/audio/これは何ですか.mp3', 'これは何ですか', 'Đây là cái gì?', '["Đây là cái gì?", "Làm ơn", "Xin lỗi, nói lại nhé", "Hôm nay trời đẹp"]'
  UNION ALL SELECT '/uploads/audio/すみません。もう一度お願いします。.mp3', 'すみません。もう一度お願いします。', 'Xin lỗi, nói lại một lần nữa nhé', '["Xin lỗi, nói lại một lần nữa nhé", "Làm ơn", "Đây là cái gì?", "Hôm nay trời đẹp"]'
  UNION ALL SELECT '/uploads/audio/今日はいい天気ですね.mp3', '今日はいい天気ですね', 'Hôm nay trời đẹp nhỉ', '["Hôm nay trời đẹp nhỉ", "Làm ơn", "Đây là cái gì?", "Xin lỗi, nói lại nhé"]'
  UNION ALL SELECT '/uploads/audio/会議は3時からです。.mp3', '会議は3時からです。', 'Cuộc họp từ 3 giờ', '["Cuộc họp từ 3 giờ", "Làm ơn", "Đây là cái gì?", "Xin lỗi, nói lại nhé"]'
) AS m
WHERE s.`jlpt_level` IN ('N5', 'N4', 'N3', 'N2', 'N1')
  AND NOT EXISTS (
    SELECT 1
    FROM `listening_items` i
    WHERE i.`set_id` = s.`set_id`
      AND i.`exercise_type` = 'multiple_choice'
      AND i.`audio_url` <=> m.audio_url
      AND i.`transcript_jp` <=> m.transcript_jp
  );

INSERT INTO `listening_items`
  (`set_id`, `exercise_type`, `audio_url`,
   `question`, `transcript_jp`, `explain_viet`)
SELECT
  s.`set_id`,
  'dictation',
  d.audio_url,
  '聞こえた内容を書いてください',
  d.transcript_jp,
  d.explain_viet
FROM `listening_sets` s
JOIN (
  SELECT '/uploads/audio/お願いします.mp3' AS audio_url, 'お願いします' AS transcript_jp, 'Làm ơn / Xin vui lòng' AS explain_viet
  UNION ALL SELECT '/uploads/audio/これは何ですか.mp3', 'これは何ですか', 'Đây là cái gì?'
  UNION ALL SELECT '/uploads/audio/今日はいい天気ですね.mp3', '今日はいい天気ですね', 'Hôm nay trời đẹp nhỉ'
  UNION ALL SELECT '/uploads/audio/会議は3時からです。.mp3', '会議は3時からです。', 'Cuộc họp từ 3 giờ'
) AS d
WHERE s.`title` = 'Luyện nghe viết lại'
  AND s.`jlpt_level` IN ('N5', 'N4', 'N3', 'N2', 'N1')
  AND NOT EXISTS (
    SELECT 1
    FROM `listening_items` i
    WHERE i.`set_id` = s.`set_id`
      AND i.`exercise_type` = 'dictation'
      AND i.`audio_url` <=> d.audio_url
  );

INSERT INTO `listening_items`
  (`set_id`, `exercise_type`, `audio_url`,
   `question`, `transcript_jp`, `explain_viet`, `words_json`)
SELECT
  s.`set_id`,
  'sentence_ordering',
  o.audio_url,
  '聞こえた内容を正しい順番に並べてください',
  o.transcript_jp,
  o.explain_viet,
  o.words_json
FROM `listening_sets` s
JOIN (
  SELECT '/uploads/audio/お願いします.mp3' AS audio_url, 'お願いします' AS transcript_jp, 'Làm ơn / Xin vui lòng' AS explain_viet, '["お願い", "します"]' AS words_json
  UNION ALL SELECT '/uploads/audio/これは何ですか.mp3', 'これは何ですか', 'Đây là cái gì?', '["これ", "は", "何", "です", "か"]'
  UNION ALL SELECT '/uploads/audio/今日はいい天気ですね.mp3', '今日はいい天気ですね', 'Hôm nay trời đẹp nhỉ', '["今日", "は", "いい", "天気", "です", "ね"]'
  UNION ALL SELECT '/uploads/audio/会議は3時からです。.mp3', '会議は3時からです。', 'Cuộc họp từ 3 giờ', '["会議", "は", "3", "時", "から", "です"]'
  UNION ALL SELECT '/uploads/audio/すみません。もう一度お願いします。.mp3', 'すみません。もう一度お願いします。', 'Xin lỗi, nói lại một lần nữa nhé', '["すみません", "もう", "一度", "お願い", "します"]'
) AS o
WHERE s.`title` = 'Luyện sắp xếp câu'
  AND s.`jlpt_level` IN ('N5', 'N4', 'N3', 'N2', 'N1')
  AND NOT EXISTS (
    SELECT 1
    FROM `listening_items` i
    WHERE i.`set_id` = s.`set_id`
      AND i.`exercise_type` = 'sentence_ordering'
      AND i.`audio_url` <=> o.audio_url
  );
