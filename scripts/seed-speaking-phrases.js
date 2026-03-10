import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const samplePhrases = [
  {
    jp: "今日はいい天気ですね。",
    romaji: "Kyou wa ii tenki desu ne.",
    vi: "Hôm nay trời đẹp nhỉ.",
    topic: "Chào hỏi",
    jlpt_level: "N5",
    is_published: true,
  },
  {
    jp: "すみません、もう一度お願いします。",
    romaji: "Sumimasen, mou ichido onegaishimasu.",
    vi: "Xin lỗi, làm ơn nhắc lại một lần nữa.",
    topic: "Giao tiếp",
    jlpt_level: "N5",
    is_published: true,
  },
  {
    jp: "駅までの行き方を教えてください。",
    romaji: "Eki made no ikikata wo oshiete kudasai.",
    vi: "Làm ơn chỉ giúp đường đến ga.",
    topic: "Hỏi đường",
    jlpt_level: "N4",
    is_published: true,
  },
  {
    jp: "おはようございます。",
    romaji: "Ohayou gozaimasu.",
    vi: "Chào buổi sáng.",
    topic: "Chào hỏi",
    jlpt_level: "N5",
    is_published: true,
  },
  {
    jp: "ありがとうございます。",
    romaji: "Arigatou gozaimasu.",
    vi: "Cảm ơn bạn.",
    topic: "Giao tiếp",
    jlpt_level: "N5",
    is_published: true,
  },
  {
    jp: "お元気ですか？",
    romaji: "Ogenki desu ka?",
    vi: "Bạn khỏe không?",
    topic: "Chào hỏi",
    jlpt_level: "N5",
    is_published: true,
  },
  {
    jp: "私は学生です。",
    romaji: "Watashi wa gakusei desu.",
    vi: "Tôi là học sinh.",
    topic: "Giới thiệu",
    jlpt_level: "N5",
    is_published: true,
  },
  {
    jp: "これは何ですか？",
    romaji: "Kore wa nan desu ka?",
    vi: "Đây là cái gì?",
    topic: "Hỏi đáp",
    jlpt_level: "N5",
    is_published: true,
  },
  {
    jp: "いくらですか？",
    romaji: "Ikura desu ka?",
    vi: "Bao nhiêu tiền?",
    topic: "Mua sắm",
    jlpt_level: "N5",
    is_published: true,
  },
  {
    jp: "お願いします。",
    romaji: "Onegaishimasu.",
    vi: "Làm ơn.",
    topic: "Giao tiếp",
    jlpt_level: "N5",
    is_published: true,
  },
];

async function main() {
  console.log("🌱 Bắt đầu seed speaking phrases...");

  for (const phrase of samplePhrases) {
    try {
      const existing = await prisma.speaking_phrases.findFirst({
        where: { jp: phrase.jp },
      });

      if (existing) {
        console.log(`⏭️  Đã tồn tại: ${phrase.jp}`);
        continue;
      }

      await prisma.speaking_phrases.create({
        data: phrase,
      });

      console.log(`✅ Đã thêm: ${phrase.jp}`);
    } catch (error) {
      console.error(`❌ Lỗi khi thêm "${phrase.jp}":`, error.message);
    }
  }

  console.log("✨ Hoàn tất seed speaking phrases!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


