import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LEVELS = ["N5", "N4", "N3", "N2", "N1"];

// Reading Comprehension Exercises
const READING_COMPREHENSION_EXERCISES = {
  N5: [
    {
      passage: "私は毎日学校へ行きます。学校で友達と勉強します。日本語の授業が好きです。",
      question: "筆者は何が好きですか？",
      options: ["学校", "友達", "日本語の授業", "勉強"],
      correctIndex: 2,
      explain_viet: "Đoạn văn nói rằng '日本語の授業が好きです' (Tôi thích lớp học tiếng Nhật).",
    },
    {
      passage: "今日は日曜日です。私は公園で散歩します。天気がいいです。",
      question: "筆者は今日何をしますか？",
      options: ["学校へ行く", "公園で散歩する", "勉強する", "友達に会う"],
      correctIndex: 1,
      explain_viet: "Đoạn văn nói '私は公園で散歩します' (Tôi đi dạo trong công viên).",
    },
  ],
  N4: [
    {
      passage: "昨日、私は図書館で本を読みました。とても面白い本でした。来週、また図書館へ行きたいです。",
      question: "筆者は来週何をしたいですか？",
      options: ["本を読む", "図書館へ行く", "面白い本を探す", "友達に会う"],
      correctIndex: 1,
      explain_viet: "Đoạn văn nói '来週、また図書館へ行きたいです' (Tuần sau tôi muốn đi thư viện nữa).",
    },
    {
      passage: "私は毎朝6時に起きます。それから、ジョギングをします。運動は健康にいいです。",
      question: "筆者は毎朝何をしますか？",
      options: ["6時に起きる", "ジョギングをする", "運動をする", "健康になる"],
      correctIndex: 1,
      explain_viet: "Đoạn văn nói 'それから、ジョギングをします' (Sau đó tôi chạy bộ).",
    },
  ],
  N3: [
    {
      passage: "日本の文化について学ぶことは、とても興味深いです。特に、伝統的な祭りや習慣が好きです。来年、日本へ旅行したいと思っています。",
      question: "筆者は何について学びたいですか？",
      options: ["日本の文化", "伝統的な祭り", "日本の習慣", "旅行"],
      correctIndex: 0,
      explain_viet: "Đoạn văn bắt đầu với '日本の文化について学ぶこと' (Học về văn hóa Nhật Bản).",
    },
  ],
};

// Fill in the Blank Exercises
const FILL_IN_THE_BLANK_EXERCISES = {
  N5: [
    {
      passage: "私は毎日(1)___を勉強しています。そして、(2)___も練習しています。将来、日本で(3)___したいです。",
      blanks: [
        {
          position: 1,
          options: ["日本語", "英語", "数学", "音楽"],
          correct_index: 0,
        },
        {
          position: 2,
          options: ["会話", "勉強", "食事", "運動"],
          correct_index: 0,
        },
        {
          position: 3,
          options: ["仕事", "旅行", "勉強", "留学"],
          correct_index: 3,
        },
      ],
      explain_viet: "Đoạn văn nói về việc học tiếng Nhật, luyện tập hội thoại, và muốn đi du học ở Nhật.",
    },
    {
      passage: "今日は(1)___です。私は(2)___で買い物をします。それから、(3)___を食べます。",
      blanks: [
        {
          position: 1,
          options: ["月曜日", "火曜日", "土曜日", "日曜日"],
          correct_index: 2,
        },
        {
          position: 2,
          options: ["学校", "図書館", "スーパー", "公園"],
          correct_index: 2,
        },
        {
          position: 3,
          options: ["本", "ご飯", "散歩", "勉強"],
          correct_index: 1,
        },
      ],
      explain_viet: "Đoạn văn nói về thứ Bảy, đi mua sắm ở siêu thị, và ăn cơm.",
    },
  ],
  N4: [
    {
      passage: "先週、私は友達と(1)___へ行きました。そこで(2)___を見ました。とても(3)___でした。",
      blanks: [
        {
          position: 1,
          options: ["映画館", "図書館", "学校", "公園"],
          correct_index: 0,
        },
        {
          position: 2,
          options: ["本", "映画", "友達", "花"],
          correct_index: 1,
        },
        {
          position: 3,
          options: ["面白い", "難しい", "高い", "小さい"],
          correct_index: 0,
        },
      ],
      explain_viet: "Đoạn văn nói về việc đi xem phim với bạn bè và thấy rất thú vị.",
    },
  ],
};

async function seedForLevel(level) {
  console.log(`\n=== Seeding ${level} ===`);

  // Check if sets already exist
  const existingSets = await prisma.reading_sets.findMany({
    where: { jlpt_level: level },
  });

  // Reading Comprehension
  let rcSet = existingSets.find((s) => s.title?.includes("Reading Comprehension"));
  if (!rcSet) {
    rcSet = await prisma.reading_sets.create({
      data: {
        title: `${level} - Reading Comprehension`,
        jlpt_level: level,
        is_published: true,
      },
    });
    console.log(`Created Reading Comprehension set: ${rcSet.set_id}`);
  } else {
    console.log(`Reading Comprehension set already exists: ${rcSet.set_id}`);
  }

  // Check if items already exist for this set
  const existingRCItems = await prisma.reading_items.findMany({
    where: {
      set_id: rcSet.set_id,
      exercise_type: "reading_comprehension",
    },
  });

  if (existingRCItems.length === 0 && READING_COMPREHENSION_EXERCISES[level]) {
    for (const exercise of READING_COMPREHENSION_EXERCISES[level]) {
      await prisma.reading_items.create({
        data: {
          set_id: rcSet.set_id,
          exercise_type: "reading_comprehension",
          passage: exercise.passage,
          question: exercise.question,
          options_json: JSON.stringify(exercise.options),
          correct_index: exercise.correctIndex,
          explain_viet: exercise.explain_viet,
        },
      });
    }
    console.log(`Created ${READING_COMPREHENSION_EXERCISES[level].length} Reading Comprehension items`);
  } else {
    console.log(`Reading Comprehension items already exist (${existingRCItems.length} items)`);
  }

  // Fill in the Blank
  let fibSet = existingSets.find((s) => s.title?.includes("Fill in the Blank"));
  if (!fibSet) {
    fibSet = await prisma.reading_sets.create({
      data: {
        title: `${level} - Fill in the Blank`,
        jlpt_level: level,
        is_published: true,
      },
    });
    console.log(`Created Fill in the Blank set: ${fibSet.set_id}`);
  } else {
    console.log(`Fill in the Blank set already exists: ${fibSet.set_id}`);
  }

  // Check if items already exist for this set
  const existingFIBItems = await prisma.reading_items.findMany({
    where: {
      set_id: fibSet.set_id,
      exercise_type: "fill_in_the_blank",
    },
  });

  if (existingFIBItems.length === 0 && FILL_IN_THE_BLANK_EXERCISES[level]) {
    for (const exercise of FILL_IN_THE_BLANK_EXERCISES[level]) {
      await prisma.reading_items.create({
        data: {
          set_id: fibSet.set_id,
          exercise_type: "fill_in_the_blank",
          passage: exercise.passage,
          blanks_json: JSON.stringify(exercise.blanks),
          explain_viet: exercise.explain_viet,
        },
      });
    }
    console.log(`Created ${FILL_IN_THE_BLANK_EXERCISES[level].length} Fill in the Blank items`);
  } else {
    console.log(`Fill in the Blank items already exist (${existingFIBItems.length} items)`);
  }
}

async function main() {
  console.log("Starting Reading seed...");

  try {
    for (const level of LEVELS) {
      await seedForLevel(level);
    }

    console.log("\n✅ Reading seed completed!");
  } catch (error) {
    console.error("❌ Error seeding reading:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

