# Listening Feature Setup Guide

## Tổng quan

Đã thêm chức năng Luyện nghe (Listening) với 3 loại bài tập:
1. **Multiple Choice** - Nghe và chọn đáp án đúng
2. **Dictation** - Nghe và viết lại nội dung
3. **Sentence Ordering** - Nghe và sắp xếp câu

## Thay đổi Database Schema

### Migration: `20260315000000_add_listening_exercise_types`

Thêm các trường mới vào bảng `listening_items`:
- `exercise_type` (ENUM): `multiple_choice`, `dictation`, `sentence_ordering` (default: `multiple_choice`)
- `words_json` (TEXT): Lưu danh sách từ cho sentence ordering

Thêm index: `idx_listening_items_type` trên `exercise_type`

## Các bước thực hiện

### 1. Apply Migration vào Database

**Cách 1: Sử dụng Prisma Migrate (Khuyến nghị)**
```bash
cd japanese-ai-backend
npx prisma migrate deploy
```

**Cách 2: Chạy SQL trực tiếp**
Nếu gặp lỗi với Prisma migrate, có thể chạy SQL trực tiếp:

```sql
ALTER TABLE `listening_items` 
ADD COLUMN `exercise_type` ENUM('multiple_choice', 'dictation', 'sentence_ordering') NOT NULL DEFAULT 'multiple_choice',
ADD COLUMN `words_json` TEXT NULL;

CREATE INDEX `idx_listening_items_type` ON `listening_items`(`exercise_type`);
```

**Cách 3: Qua Docker MySQL**
```bash
# Copy migration file vào container
docker cp japanese-ai-backend/prisma/migrations/20260315000000_add_listening_exercise_types/migration.sql nihongo-mysql:/tmp/migration.sql

# Chạy migration
docker exec -i nihongo-mysql mysql -unihongo -pnihongo nihongo < /tmp/migration.sql
```

### 2. Generate Prisma Client (Đã hoàn thành)

Prisma Client đã được generate với các thay đổi mới:
```bash
npx prisma generate
```

### 3. Restart Backend Server

Sau khi apply migration, restart backend server:
```bash
cd japanese-ai-backend
npm run dev
```

## API Endpoints mới

### 1. GET `/api/listening?level=N5&exerciseType=multiple_choice`
Lấy danh sách bài tập theo level và exercise type.

**Query Parameters:**
- `level` (required): N5, N4, N3, N2, N1
- `exerciseType` (optional): `multiple_choice`, `dictation`, `sentence_ordering`

### 2. POST `/api/listening/check-dictation`
Kiểm tra đáp án dictation.

**Request Body:**
```json
{
  "itemId": 1,
  "userAnswer": "聞こえた内容"
}
```

**Response:**
```json
{
  "isCorrect": true,
  "accuracy": 100,
  "correctAnswer": "聞こえた内容",
  "differences": []
}
```

### 3. POST `/api/listening/check-sentence-ordering`
Kiểm tra đáp án sentence ordering.

**Request Body:**
```json
{
  "itemId": 1,
  "orderedWords": ["私", "は", "来年", "日本", "へ", "行きます"]
}
```

**Response:**
```json
{
  "isCorrect": true,
  "correctAnswer": "私は来年日本へ行きます",
  "correctWords": ["私", "は", "来年", "日本", "へ", "行きます"]
}
```

## Cấu trúc dữ liệu

### Multiple Choice
```json
{
  "exercise_type": "multiple_choice",
  "options_json": "[\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"]",
  "correct_index": 0,
  "transcript_jp": "会話の内容",
  "explain_viet": "Giải thích"
}
```

### Dictation
```json
{
  "exercise_type": "dictation",
  "transcript_jp": "聞こえた内容を書いてください",
  "explain_viet": "Giải thích"
}
```

### Sentence Ordering
```json
{
  "exercise_type": "sentence_ordering",
  "words_json": "[\"私\", \"は\", \"来年\", \"日本\", \"へ\", \"行きます\"]",
  "transcript_jp": "私は来年日本へ行きます",
  "explain_viet": "Giải thích"
}
```

## Frontend Components

### Main Page
- `src/pages/Listening.jsx` - Trang chính với flow 2 bước

### Exercise Components
- `src/components/listening/MultipleChoiceExercise.jsx`
- `src/components/listening/DictationExercise.jsx`
- `src/components/listening/SentenceOrderingExercise.jsx`

## Kiểm tra

### 1. Test API
```bash
# Test lấy danh sách bài tập
curl "http://localhost:4000/api/listening?level=N5&exerciseType=multiple_choice"

# Test check dictation
curl -X POST http://localhost:4000/api/listening/check-dictation \
  -H "Content-Type: application/json" \
  -d '{"itemId": 1, "userAnswer": "test"}'
```

### 2. Test Frontend
1. Mở `http://localhost:3000/listening`
2. Chọn Level (N5-N1)
3. Chọn Exercise Type
4. Làm bài tập và kiểm tra kết quả

## Lưu ý

1. **Migration đã được tạo sẵn** trong `prisma/migrations/20260315000000_add_listening_exercise_types/`
2. **Prisma Client đã được generate** với các types mới
3. **Các bài tập cũ** sẽ tự động có `exercise_type = 'multiple_choice'` (default)
4. **Cần thêm dữ liệu mẫu** cho dictation và sentence ordering để test

## Troubleshooting

### Lỗi: "Column 'exercise_type' does not exist"
- Chưa apply migration vào database
- Chạy migration theo hướng dẫn ở trên

### Lỗi: "Cannot read properties of undefined"
- Prisma Client chưa được generate lại
- Chạy: `npx prisma generate`

### Không có bài tập hiển thị
- Kiểm tra `is_published = true` trong database
- Kiểm tra `exercise_type` đúng với loại đã chọn
- Thêm dữ liệu mẫu nếu cần

