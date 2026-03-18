FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

EXPOSE 4000

# Khi container khởi động:
# 1. Đồng bộ schema Prisma với database (db:push)
# 2. Seed dữ liệu mẫu (idempotent)
# 3. Khởi động server
CMD ["sh", "-c", "npm run db:bootstrap:push && node src/server.js"]