# Setup Instructions - Speaking Practice Feature

## ✅ Database đã được sync thành công!

Database schema đã được cập nhật với các tables mới:
- `speaking_phrases`
- `speaking_attempts`

## 🔧 Bước tiếp theo:

### 1. Dừng Backend Server
**QUAN TRỌNG:** Bạn cần dừng backend server đang chạy trước khi generate Prisma Client.

- Tìm terminal đang chạy `npm run dev` hoặc `node src/server.js`
- Nhấn `Ctrl+C` để dừng server

### 2. Generate Prisma Client
Sau khi dừng server, chạy:

```bash
cd japanese-ai-backend
npx prisma generate
```

### 3. Seed dữ liệu mẫu (tùy chọn)
Nếu muốn có dữ liệu mẫu để test:

```bash
npm run seed:speaking
```

### 4. Restart Backend Server
```bash
npm run dev
```

## ✅ Kiểm tra

Sau khi restart server, test API:

```bash
# Test lấy danh sách phrases
curl http://localhost:4000/api/speaking/phrases
```

Nếu thành công, bạn sẽ thấy response JSON với danh sách phrases (có thể rỗng nếu chưa seed).

## 🐛 Nếu vẫn lỗi

Nếu vẫn gặp lỗi "Cannot read properties of undefined", thử:

1. **Xóa cache Prisma và generate lại:**
```powershell
Remove-Item -Recurse -Force node_modules\.prisma
npx prisma generate
```

2. **Kiểm tra Prisma Client:**
```bash
# Mở file này và tìm "speaking_phrases"
# node_modules/.prisma/client/index.d.ts
```

3. **Restart lại server**

## 📝 Lưu ý

- Luôn dừng server trước khi chạy `prisma generate`
- Nếu server đang chạy, Prisma không thể ghi đè file query engine
- Sau khi generate xong, restart server để load Prisma Client mới


