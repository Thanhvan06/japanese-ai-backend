-- ============================================================================
-- Nguồn: japanese-ai-backend/scripts/seed-reading.js (file .js giữ nguyên để đối chiếu).
-- Mục đích: reading_sets + reading_items — bài đọc hiểu + điền vào chỗ trống.
-- Tạo set theo cấp JLPT; chỉ thêm item khi set chưa có item cùng exercise_type
-- và cùng nội dung passage (tránh trùng lặp khi chạy lại).
-- Đã rút gọn phần tạo set để tránh lặp literal theo từng cấp.
-- ============================================================================

INSERT INTO `reading_sets` (`title`, `jlpt_level`, `is_published`)
SELECT
  CONCAT(l.jlpt_level, ' - ', t.title_suffix) AS title,
  l.jlpt_level,
  1 AS is_published
FROM (
  SELECT 'N5' AS jlpt_level
  UNION ALL SELECT 'N4'
  UNION ALL SELECT 'N3'
  UNION ALL SELECT 'N2'
  UNION ALL SELECT 'N1'
) AS l
CROSS JOIN (
  SELECT 'Reading Comprehension' AS title_suffix
  UNION ALL SELECT 'Fill in the Blank'
) AS t
WHERE NOT EXISTS (
  SELECT 1
  FROM `reading_sets` x
  WHERE x.`title` = CONCAT(l.jlpt_level, ' - ', t.title_suffix)
    AND x.`jlpt_level` = l.jlpt_level
);

INSERT INTO `reading_items` (`set_id`, `exercise_type`, `passage`, `question`, `options_json`, `correct_index`, `explain_viet`)
SELECT s.`set_id`, 'reading_comprehension', '私は毎日学校へ行きます。学校で友達と勉強します。日本語の授業が好きです。', '筆者は何が好きですか？', '["学校", "友達", "日本語の授業", "勉強"]', 2, 'Đoạn văn nói rằng ''日本語の授業が好きです'' (Tôi thích lớp học tiếng Nhật).'
FROM `reading_sets` s
WHERE s.`title` = 'N5 - Reading Comprehension' AND s.`jlpt_level` = 'N5'
  AND NOT EXISTS (
    SELECT 1 FROM `reading_items` i
    WHERE i.`set_id` = s.`set_id` AND i.`exercise_type` = 'reading_comprehension'
      AND i.`passage` <=> '私は毎日学校へ行きます。学校で友達と勉強します。日本語の授業が好きです。'
  );

INSERT INTO `reading_items` (`set_id`, `exercise_type`, `passage`, `question`, `options_json`, `correct_index`, `explain_viet`)
SELECT s.`set_id`, 'reading_comprehension', '今日は日曜日です。私は公園で散歩します。天気がいいです。', '筆者は今日何をしますか？', '["学校へ行く", "公園で散歩する", "勉強する", "友達に会う"]', 1, 'Đoạn văn nói ''私は公園で散歩します'' (Tôi đi dạo trong công viên).'
FROM `reading_sets` s
WHERE s.`title` = 'N5 - Reading Comprehension' AND s.`jlpt_level` = 'N5'
  AND NOT EXISTS (
    SELECT 1 FROM `reading_items` i
    WHERE i.`set_id` = s.`set_id` AND i.`exercise_type` = 'reading_comprehension'
      AND i.`passage` <=> '今日は日曜日です。私は公園で散歩します。天気がいいです。'
  );

INSERT INTO `reading_items` (`set_id`, `exercise_type`, `passage`, `blanks_json`, `explain_viet`)
SELECT s.`set_id`, 'fill_in_the_blank', '私は毎日(1)___を勉強しています。そして、(2)___も練習しています。将来、日本で(3)___したいです。', '[{"position": 1, "options": ["日本語", "英語", "数学", "音楽"], "correct_index": 0}, {"position": 2, "options": ["会話", "勉強", "食事", "運動"], "correct_index": 0}, {"position": 3, "options": ["仕事", "旅行", "勉強", "留学"], "correct_index": 3}]', 'Đoạn văn nói về việc học tiếng Nhật, luyện tập hội thoại, và muốn đi du học ở Nhật.'
FROM `reading_sets` s
WHERE s.`title` = 'N5 - Fill in the Blank' AND s.`jlpt_level` = 'N5'
  AND NOT EXISTS (
    SELECT 1 FROM `reading_items` i
    WHERE i.`set_id` = s.`set_id` AND i.`exercise_type` = 'fill_in_the_blank'
      AND i.`passage` <=> '私は毎日(1)___を勉強しています。そして、(2)___も練習しています。将来、日本で(3)___したいです。'
  );

INSERT INTO `reading_items` (`set_id`, `exercise_type`, `passage`, `blanks_json`, `explain_viet`)
SELECT s.`set_id`, 'fill_in_the_blank', '今日は(1)___です。私は(2)___で買い物をします。それから、(3)___を食べます。', '[{"position": 1, "options": ["月曜日", "火曜日", "土曜日", "日曜日"], "correct_index": 2}, {"position": 2, "options": ["学校", "図書館", "スーパー", "公園"], "correct_index": 2}, {"position": 3, "options": ["本", "ご飯", "散歩", "勉強"], "correct_index": 1}]', 'Đoạn văn nói về thứ Bảy, đi mua sắm ở siêu thị, và ăn cơm.'
FROM `reading_sets` s
WHERE s.`title` = 'N5 - Fill in the Blank' AND s.`jlpt_level` = 'N5'
  AND NOT EXISTS (
    SELECT 1 FROM `reading_items` i
    WHERE i.`set_id` = s.`set_id` AND i.`exercise_type` = 'fill_in_the_blank'
      AND i.`passage` <=> '今日は(1)___です。私は(2)___で買い物をします。それから、(3)___を食べます。'
  );

INSERT INTO `reading_items` (`set_id`, `exercise_type`, `passage`, `question`, `options_json`, `correct_index`, `explain_viet`)
SELECT s.`set_id`, 'reading_comprehension', '昨日、私は図書館で本を読みました。とても面白い本でした。来週、また図書館へ行きたいです。', '筆者は来週何をしたいですか？', '["本を読む", "図書館へ行く", "面白い本を探す", "友達に会う"]', 1, 'Đoạn văn nói ''来週、また図書館へ行きたいです'' (Tuần sau tôi muốn đi thư viện nữa).'
FROM `reading_sets` s
WHERE s.`title` = 'N4 - Reading Comprehension' AND s.`jlpt_level` = 'N4'
  AND NOT EXISTS (
    SELECT 1 FROM `reading_items` i
    WHERE i.`set_id` = s.`set_id` AND i.`exercise_type` = 'reading_comprehension'
      AND i.`passage` <=> '昨日、私は図書館で本を読みました。とても面白い本でした。来週、また図書館へ行きたいです。'
  );

INSERT INTO `reading_items` (`set_id`, `exercise_type`, `passage`, `question`, `options_json`, `correct_index`, `explain_viet`)
SELECT s.`set_id`, 'reading_comprehension', '私は毎朝6時に起きます。それから、ジョギングをします。運動は健康にいいです。', '筆者は毎朝何をしますか？', '["6時に起きる", "ジョギングをする", "運動をする", "健康になる"]', 1, 'Đoạn văn nói ''それから、ジョギングをします'' (Sau đó tôi chạy bộ).'
FROM `reading_sets` s
WHERE s.`title` = 'N4 - Reading Comprehension' AND s.`jlpt_level` = 'N4'
  AND NOT EXISTS (
    SELECT 1 FROM `reading_items` i
    WHERE i.`set_id` = s.`set_id` AND i.`exercise_type` = 'reading_comprehension'
      AND i.`passage` <=> '私は毎朝6時に起きます。それから、ジョギングをします。運動は健康にいいです。'
  );

INSERT INTO `reading_items` (`set_id`, `exercise_type`, `passage`, `blanks_json`, `explain_viet`)
SELECT s.`set_id`, 'fill_in_the_blank', '先週、私は友達と(1)___へ行きました。そこで(2)___を見ました。とても(3)___でした。', '[{"position": 1, "options": ["映画館", "図書館", "学校", "公園"], "correct_index": 0}, {"position": 2, "options": ["本", "映画", "友達", "花"], "correct_index": 1}, {"position": 3, "options": ["面白い", "難しい", "高い", "小さい"], "correct_index": 0}]', 'Đoạn văn nói về việc đi xem phim với bạn bè và thấy rất thú vị.'
FROM `reading_sets` s
WHERE s.`title` = 'N4 - Fill in the Blank' AND s.`jlpt_level` = 'N4'
  AND NOT EXISTS (
    SELECT 1 FROM `reading_items` i
    WHERE i.`set_id` = s.`set_id` AND i.`exercise_type` = 'fill_in_the_blank'
      AND i.`passage` <=> '先週、私は友達と(1)___へ行きました。そこで(2)___を見ました。とても(3)___でした。'
  );

INSERT INTO `reading_items` (`set_id`, `exercise_type`, `passage`, `question`, `options_json`, `correct_index`, `explain_viet`)
SELECT s.`set_id`, 'reading_comprehension', '日本の文化について学ぶことは、とても興味深いです。特に、伝統的な祭りや習慣が好きです。来年、日本へ旅行したいと思っています。', '筆者は何について学びたいですか？', '["日本の文化", "伝統的な祭り", "日本の習慣", "旅行"]', 0, 'Đoạn văn bắt đầu với ''日本の文化について学ぶこと'' (Học về văn hóa Nhật Bản).'
FROM `reading_sets` s
WHERE s.`title` = 'N3 - Reading Comprehension' AND s.`jlpt_level` = 'N3'
  AND NOT EXISTS (
    SELECT 1 FROM `reading_items` i
    WHERE i.`set_id` = s.`set_id` AND i.`exercise_type` = 'reading_comprehension'
      AND i.`passage` <=> '日本の文化について学ぶことは、とても興味深いです。特に、伝統的な祭りや習慣が好きです。来年、日本へ旅行したいと思っています。'
  );

