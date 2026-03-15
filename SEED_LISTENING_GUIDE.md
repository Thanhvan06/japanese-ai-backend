# Hướng dẫn Seed dữ liệu Listening

## Tổng quan

Script seed đã được cập nhật để hỗ trợ 3 loại bài tập:
1. **Multiple Choice** - Nghe và chọn đáp án (10 bài)
2. **Dictation** - Nghe và viết lại (4 bài)
3. **Sentence Ordering** - Nghe và sắp xếp câu (5 bài)

## Chạy Seed

### Trong Docker

```bash
# Chạy seed script trong backend container
docker exec -it nihongo-backend npm run seed:listening
```

### Ngoài Docker

```bash
cd japanese-ai-backend
npm run seed:listening
```

## Dữ liệu được tạo

### Multiple Choice Exercises
- Set: "Câu giao tiếp cơ bản" và "Câu thường dùng hàng ngày"
- Sử dụng các audio files có sẵn
- Mỗi level có 10 bài tập

### Dictation Exercises
- Set: "Luyện nghe viết lại"
- 4 bài tập với các câu ngắn:
  - お願いします
  - これは何ですか
  - 今日はいい天気ですね
  - 会議は3時からです。

### Sentence Ordering Exercises
- Set: "Luyện sắp xếp câu"
- 5 bài tập với các câu được chia thành từ:
  - お願いします → ["お願い", "します"]
  - これは何ですか → ["これ", "は", "何", "です", "か"]
  - 今日はいい天気ですね → ["今日", "は", "いい", "天気", "です", "ね"]
  - 会議は3時からです。 → ["会議", "は", "3", "時", "から", "です"]
  - すみません。もう一度お願いします。 → ["すみません", "もう", "一度", "お願い", "します"]

## Logic Seed

Script sẽ:
- Kiểm tra từng loại bài tập đã tồn tại chưa
- Chỉ seed các loại chưa có
- Không ghi đè dữ liệu đã tồn tại
- Seed cho tất cả các level: N5, N4, N3, N2, N1

## Kiểm tra kết quả

Sau khi chạy seed, kiểm tra:

```bash
# Vào MySQL container
docker exec -it nihongo-mysql mysql -unihongo -pnihongo nihongo

# Kiểm tra số lượng bài tập
SELECT exercise_type, COUNT(*) as count 
FROM listening_items 
GROUP BY exercise_type;

# Xem chi tiết
SELECT set_id, title, jlpt_level 
FROM listening_sets 
WHERE is_published = true;
```

## Giao diện Frontend

Các component đã được tạo:
- `src/pages/Listening.jsx` - Trang chính với flow 2 bước
- `src/components/listening/MultipleChoiceExercise.jsx`
- `src/components/listening/DictationExercise.jsx`
- `src/components/listening/SentenceOrderingExercise.jsx`

## Test

1. Chạy seed: `docker exec -it nihongo-backend npm run seed:listening`
2. Mở frontend: `http://localhost:3000/listening`
3. Chọn Level → Chọn Exercise Type
4. Làm bài tập và kiểm tra kết quả

