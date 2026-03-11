import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_AUDIO = "/uploads/audio";

const AUDIO_PHRASES = [
  {
    filename: "お願いします.mp3",
    transcript_jp: "お願いします",
    explain_viet: "Làm ơn / Xin vui lòng",
    wrongOptions: ["Đây là cái gì?", "Xin lỗi, nói lại nhé", "Hôm nay trời đẹp", "Cuộc họp từ 3 giờ"],
  },
  {
    filename: "これは何ですか.mp3",
    transcript_jp: "これは何ですか",
    explain_viet: "Đây là cái gì?",
    wrongOptions: ["Làm ơn", "Xin lỗi, nói lại nhé", "Hôm nay trời đẹp", "Cuộc họp từ 3 giờ"],
  },
  {
    filename: "すみません。もう一度お願いします。.mp3",
    transcript_jp: "すみません。もう一度お願いします。",
    explain_viet: "Xin lỗi, nói lại một lần nữa nhé",
    wrongOptions: ["Làm ơn", "Đây là cái gì?", "Hôm nay trời đẹp", "Cuộc họp từ 3 giờ"],
  },
  {
    filename: "今日はいい天気ですね.mp3",
    transcript_jp: "今日はいい天気ですね",
    explain_viet: "Hôm nay trời đẹp nhỉ",
    wrongOptions: ["Làm ơn", "Đây là cái gì?", "Xin lỗi, nói lại nhé", "Cuộc họp từ 3 giờ"],
  },
  {
    filename: "会議は3時からです。.mp3",
    transcript_jp: "会議は3時からです。",
    explain_viet: "Cuộc họp từ 3 giờ",
    wrongOptions: ["Làm ơn", "Đây là cái gì?", "Xin lỗi, nói lại nhé", "Hôm nay trời đẹp nhỉ"],
  },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildOptions(correct, wrongOptions) {
  const options = [correct, ...wrongOptions.slice(0, 3)];
  const shuffled = shuffle(options);
  const correctIndex = shuffled.indexOf(correct);
  return { options: shuffled, correctIndex };
}

async function seedForLevel(level) {
  const existing = await prisma.listening_sets.findFirst({
    where: { jlpt_level: level },
    include: { items: true },
  });
  if (existing && existing.items.length > 0) {
    console.log(`Listening data already seeded for ${level}. Skip.`);
    return;
  }

  const set1 = await prisma.listening_sets.create({
    data: {
      title: "Câu giao tiếp cơ bản",
      jlpt_level: level,
      is_published: true,
    },
  });

  const set2 = await prisma.listening_sets.create({
    data: {
      title: "Câu thường dùng hàng ngày",
      jlpt_level: level,
      is_published: true,
    },
  });

  const sets = [set1, set2];
  let itemIndex = 0;

  for (const phrase of AUDIO_PHRASES) {
    for (let dup = 0; dup < 2; dup++) {
      const set = sets[itemIndex % 2];
      const { options, correctIndex } = buildOptions(
        phrase.explain_viet,
        phrase.wrongOptions
      );
      await prisma.listening_items.create({
        data: {
          set_id: set.set_id,
          audio_url: `${BASE_AUDIO}/${phrase.filename}`,
          options_json: JSON.stringify(options),
          question: "Bạn nghe thấy gì? Chọn nghĩa tiếng Việt đúng.",
          transcript_jp: phrase.transcript_jp,
          explain_viet: phrase.explain_viet,
          correct_index: correctIndex,
        },
      });
      itemIndex++;
    }
  }

  const count = await prisma.listening_items.count({
    where: { set: { jlpt_level: level } },
  });
  console.log(`Seeded ${count} listening items for ${level}.`);
}

async function main() {
  const levels = ["N5", "N4", "N3", "N2", "N1"];
  for (const level of levels) {
    await seedForLevel(level);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
