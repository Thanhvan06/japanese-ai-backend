FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

COPY . .

EXPOSE 4000

# db:bootstrap: prisma db push theo schema.prisma, seed mẫu, seed admin, rồi server.
CMD ["sh", "-c", "npm run db:bootstrap && npm run seed:admin && node src/server.js"]