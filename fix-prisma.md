# Fix: Cannot read properties of undefined (reading 'findMany')

Lỗi này xảy ra vì Prisma Client chưa được generate lại sau khi thêm model mới.

## Giải pháp:

### Bước 1: Dừng Backend Server
Dừng backend server đang chạy (Ctrl+C trong terminal chạy server)

### Bước 2: Generate Prisma Client
```bash
cd japanese-ai-backend
npx prisma generate
```

### Bước 3: Chạy Migration (nếu chưa chạy)
```bash
npx prisma migrate dev --name add_speaking_tables
```

### Bước 4: Restart Backend Server
```bash
npm run dev
```

## Nếu vẫn lỗi:

1. Xóa node_modules/.prisma và generate lại:
```bash
rm -rf node_modules/.prisma
npx prisma generate
```

2. Hoặc trên Windows:
```powershell
Remove-Item -Recurse -Force node_modules\.prisma
npx prisma generate
```

3. Kiểm tra Prisma client đã có model mới chưa:
```bash
# Mở file node_modules/.prisma/client/index.d.ts
# Tìm "speaking_phrases" xem có không
```


