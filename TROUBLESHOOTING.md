# Troubleshooting Guide - Speaking Practice

## Lỗi 500 Internal Server Error

### 1. Database chưa được migrate

**Triệu chứng:** Lỗi khi gọi API `/api/speaking/phrases` với message về `speaking_phrases` table không tồn tại.

**Giải pháp:**
```bash
# Chạy migration để tạo tables mới
npx prisma migrate dev --name add_speaking_tables

# Generate Prisma client lại
npx prisma generate
```

### 2. Prisma Client chưa được generate

**Triệu chứng:** Lỗi `Cannot find module` hoặc `speaking_phrases is not defined`.

**Giải pháp:**
```bash
npx prisma generate
```

### 3. Whisper API không chạy

**Triệu chứng:** Lỗi `ECONNREFUSED` hoặc `Không thể kết nối tới Whisper API`.

**Giải pháp:**
```bash
# Kiểm tra Docker container
docker ps

# Khởi động Whisper container
cd japanese-ai-backend
docker compose up -d

# Kiểm tra logs
docker compose logs whisper
```

### 4. FFmpeg chưa được cài đặt

**Triệu chứng:** Lỗi khi xử lý audio, message về `ffmpeg` không tìm thấy.

**Giải pháp:**
- **Windows:** Download từ https://ffmpeg.org/download.html và thêm vào PATH
- **Mac:** `brew install ffmpeg`
- **Linux:** `sudo apt install ffmpeg`

### 5. Thiếu dữ liệu mẫu

**Triệu chứng:** API trả về empty array `[]` khi gọi `/api/speaking/phrases`.

**Giải pháp:**
```bash
# Seed dữ liệu mẫu
npm run seed:speaking
```

### 6. Lỗi quyền truy cập file

**Triệu chứng:** Lỗi khi upload hoặc xử lý file audio.

**Giải pháp:**
- Kiểm tra thư mục `uploads/audio` và `uploads/temp` có tồn tại và có quyền ghi
- Tạo thư mục nếu chưa có:
```bash
mkdir -p uploads/audio uploads/temp
```

## Kiểm tra Logs

### Backend Logs
Xem logs trong terminal nơi chạy backend server để thấy chi tiết lỗi.

### Database Logs
```bash
# Xem Prisma logs
npx prisma studio
```

### Docker Logs
```bash
docker compose logs -f whisper
```

## Test API Endpoints

### 1. Test GET phrases
```bash
curl http://localhost:4000/api/speaking/phrases
```

### 2. Test Whisper API
```bash
curl http://localhost:9000/docs
```

### 3. Test upload audio
```bash
curl -X POST http://localhost:4000/api/speaking/practice \
  -F "audio=@test-audio.webm" \
  -F "phraseId=1"
```

## Environment Variables

Đảm bảo file `.env` có các biến sau:

```env
DATABASE_URL="mysql://user:password@localhost:3306/dbname"
WHISPER_API_URL=http://localhost:9000
BASE_URL=http://localhost:4000
JWT_SECRET=your-secret-key
```

## Common Issues

### Issue: "Cannot read property 'findMany' of undefined"
**Solution:** Chạy `npx prisma generate` và restart server.

### Issue: "Table 'speaking_phrases' doesn't exist"
**Solution:** Chạy migration: `npx prisma migrate dev`

### Issue: "FFmpeg not found"
**Solution:** Cài đặt FFmpeg và đảm bảo nó có trong PATH.

### Issue: "Whisper API timeout"
**Solution:** 
- Kiểm tra Docker container đang chạy
- Tăng timeout trong code nếu cần
- Kiểm tra CPU usage (Whisper CPU có thể chậm)


