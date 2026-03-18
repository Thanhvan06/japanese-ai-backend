# API Documentation - Speaking Practice

Tài liệu API cho chức năng luyện nói tiếng Nhật.

## Cấu hình

### Environment Variables

Thêm vào file `.env`:

```env
WHISPER_API_URL=http://localhost:9000
BASE_URL=http://localhost:4000
```

### Database Migration

Sau khi cập nhật schema, chạy migration:

```bash
npx prisma migrate dev --name add_speaking_tables
```

### Seed Data

Chạy script để thêm dữ liệu mẫu:

```bash
npm run seed:speaking
```

## API Endpoints

### 1. Lấy danh sách câu mẫu

**GET** `/api/speaking/phrases`

**Query Parameters:**
- `level` (optional): JLPT level (N5, N4, N3, N2, N1)
- `topic` (optional): Topic của câu (ví dụ: "Chào hỏi", "Giao tiếp")
- `limit` (optional): Số lượng kết quả (default: 50)
- `offset` (optional): Offset cho pagination (default: 0)

**Response:**
```json
{
  "phrases": [
    {
      "phrase_id": 1,
      "jp": "今日はいい天気ですね。",
      "romaji": "Kyou wa ii tenki desu ne.",
      "vi": "Hôm nay trời đẹp nhỉ.",
      "topic": "Chào hỏi",
      "jlpt_level": "N5",
      "audio_url": null,
      "is_published": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

### 2. Lấy chi tiết một câu mẫu

**GET** `/api/speaking/phrases/:id`

**Response:**
```json
{
  "phrase_id": 1,
  "jp": "今日はいい天気ですね。",
  "romaji": "Kyou wa ii tenki desu ne.",
  "vi": "Hôm nay trời đẹp nhỉ.",
  "topic": "Chào hỏi",
  "jlpt_level": "N5",
  "audio_url": null,
  "is_published": true,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### 3. Luyện nói (Upload audio và chấm điểm)

**POST** `/api/speaking/practice`

**Content-Type:** `multipart/form-data`

**Body:**
- `audio` (file): File audio (mp3, wav, ogg, m4a, webm)
- `phraseId` (string): ID của câu mẫu

**Response:**
```json
{
  "success": true,
  "phrase": {
    "id": 1,
    "jp": "今日はいい天気ですね。",
    "romaji": "Kyou wa ii tenki desu ne.",
    "vi": "Hôm nay trời đẹp nhỉ."
  },
  "transcribedText": "今日はいい天気ですね",
  "score": {
    "accuracy": 95.5,
    "similarity": 92.3,
    "wordAccuracy": 100,
    "feedback": "Xuất sắc! Phát âm rất chính xác.",
    "errors": []
  },
  "audioUrl": "http://localhost:4000/uploads/audio/audio-1234567890.wav",
  "attemptId": 1
}
```

**Lưu ý:**
- Audio sẽ được tự động chuẩn hóa về 16kHz Mono trước khi gửi tới Whisper
- Nếu user đã đăng nhập, attempt sẽ được lưu vào database
- Nếu không đăng nhập, vẫn có thể luyện tập nhưng không lưu lịch sử

### 4. Lấy lịch sử luyện nói (Cần đăng nhập)

**GET** `/api/speaking/attempts`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Số lượng kết quả (default: 20)
- `offset` (optional): Offset cho pagination (default: 0)

**Response:**
```json
{
  "attempts": [
    {
      "attempt_id": 1,
      "user_id": 1,
      "phrase_id": 1,
      "audio_url": "http://localhost:4000/uploads/audio/audio-1234567890.wav",
      "transcribed_text": "今日はいい天気ですね",
      "accuracy_score": 95.5,
      "details_json": "{\"accuracy\":95.5,\"similarity\":92.3,...}",
      "created_at": "2024-01-01T00:00:00.000Z",
      "speaking_phrases": {
        "phrase_id": 1,
        "jp": "今日はいい天気ですね。",
        "romaji": "Kyou wa ii tenki desu ne.",
        "vi": "Hôm nay trời đẹp nhỉ.",
        "topic": "Chào hỏi"
      }
    }
  ],
  "total": 1
}
```

### 5. Lấy thống kê luyện nói (Cần đăng nhập)

**GET** `/api/speaking/stats`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "totalAttempts": 10,
  "averageScore": 87.5,
  "recentAttempts": [
    {
      "score": 95.5,
      "date": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Flow hoạt động

1. **Người dùng chọn câu mẫu**: Gọi `GET /api/speaking/phrases` để lấy danh sách
2. **Người dùng ghi âm**: Sử dụng microphone trên frontend
3. **Upload và chấm điểm**: Gọi `POST /api/speaking/practice` với file audio
4. **Backend xử lý**:
   - Chuẩn hóa audio về 16kHz Mono
   - Gửi tới Whisper API để transcribe
   - So sánh text với câu mẫu và chấm điểm
   - Lưu attempt vào database (nếu đã đăng nhập)
5. **Hiển thị kết quả**: Frontend hiển thị transcribed text và điểm số

## Scoring Algorithm

Hệ thống chấm điểm sử dụng:
- **Levenshtein Distance**: Tính khoảng cách giữa 2 chuỗi
- **Character-level Accuracy**: Đếm số ký tự đúng ở vị trí tương ứng
- **Word-level Accuracy**: So sánh từng từ (nếu có)
- **Error Analysis**: Phân tích chi tiết các lỗi

## Lưu ý

1. **Whisper API**: Cần đảm bảo Docker container Whisper đang chạy
   ```bash
   docker compose up -d
   ```

2. **FFmpeg**: Cần cài đặt FFmpeg trên hệ thống để xử lý audio
   - Windows: Download từ https://ffmpeg.org/download.html
   - Mac: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

3. **File Size**: Giới hạn upload là 10MB

4. **Audio Format**: Hỗ trợ mp3, wav, ogg, m4a, webm


