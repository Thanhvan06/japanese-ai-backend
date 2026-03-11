import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const basePhrases = [
  {
    jp: "今日はいい天気ですね。",
    romaji: "Kyou wa ii tenki desu ne.",
    vi: "Hôm nay trời đẹp nhỉ.",
    topic: "Chào hỏi",
  },
  {
    jp: "すみません、もう一度お願いします。",
    romaji: "Sumimasen, mou ichido onegaishimasu.",
    vi: "Xin lỗi, làm ơn nhắc lại một lần nữa.",
    topic: "Giao tiếp",
  },
  {
    jp: "駅までの行き方を教えてください。",
    romaji: "Eki made no ikikata wo oshiete kudasai.",
    vi: "Làm ơn chỉ giúp đường đến ga.",
    topic: "Hỏi đường",
  },
  {
    jp: "おはようございます。",
    romaji: "Ohayou gozaimasu.",
    vi: "Chào buổi sáng.",
    topic: "Chào hỏi",
  },
  {
    jp: "ありがとうございます。",
    romaji: "Arigatou gozaimasu.",
    vi: "Cảm ơn bạn.",
    topic: "Giao tiếp",
  },
  {
    jp: "お元気ですか？",
    romaji: "Ogenki desu ka?",
    vi: "Bạn khỏe không?",
    topic: "Chào hỏi",
  },
  {
    jp: "私は学生です。",
    romaji: "Watashi wa gakusei desu.",
    vi: "Tôi là học sinh.",
    topic: "Giới thiệu",
  },
  {
    jp: "これは何ですか？",
    romaji: "Kore wa nan desu ka?",
    vi: "Đây là cái gì?",
    topic: "Hỏi đáp",
  },
  {
    jp: "いくらですか？",
    romaji: "Ikura desu ka?",
    vi: "Bao nhiêu tiền?",
    topic: "Mua sắm",
  },
  {
    jp: "お願いします。",
    romaji: "Onegaishimasu.",
    vi: "Làm ơn.",
    topic: "Giao tiếp",
  },
];

async function main() {
  console.log("🌱 Bắt đầu seed speaking phrases...");

  const levels = ["N5", "N4", "N3", "N2", "N1"];

  for (const level of levels) {
    for (const phrase of basePhrases) {
      try {
        const existing = await prisma.speaking_phrases.findFirst({
          where: { jp: phrase.jp, jlpt_level: level },
        });

        if (existing) {
          console.log(`⏭️  Đã tồn tại: ${phrase.jp} (${level})`);
          continue;
        }

        await prisma.speaking_phrases.create({
          data: {
            ...phrase,
            jlpt_level: level,
            is_published: true,
          },
        });

        console.log(`✅ Đã thêm: ${phrase.jp} (${level})`);
      } catch (error) {
        console.error(
          `❌ Lỗi khi thêm "${phrase.jp}" (${level}):`,
          error.message
        );
      }
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


