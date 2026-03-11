FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

EXPOSE 4000

# Khi container khởi động:
# 1. Generate Prisma client
# 2. Chạy migrate (idempotent)
# 3. Seed dữ liệu (script đã tự kiểm tra để không bị trùng)
# 4. Khởi động server
CMD ["sh", "-c", "npm run db:bootstrap && node src/server.js"]