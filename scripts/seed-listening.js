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

const DICTATION_EXERCISES = [
  {
    filename: "お願いします.mp3",
    transcript_jp: "お願いします",
    explain_viet: "Làm ơn / Xin vui lòng",
  },
  {
    filename: "これは何ですか.mp3",
    transcript_jp: "これは何ですか",
    explain_viet: "Đây là cái gì?",
  },
  {
    filename: "今日はいい天気ですね.mp3",
    transcript_jp: "今日はいい天気ですね",
    explain_viet: "Hôm nay trời đẹp nhỉ",
  },
  {
    filename: "会議は3時からです。.mp3",
    transcript_jp: "会議は3時からです。",
    explain_viet: "Cuộc họp từ 3 giờ",
  },
];

const SENTENCE_ORDERING_EXERCISES = [
  {
    filename: "お願いします.mp3",
    transcript_jp: "お願いします",
    words: ["お願い", "します"],
    explain_viet: "Làm ơn / Xin vui lòng",
  },
  {
    filename: "これは何ですか.mp3",
    transcript_jp: "これは何ですか",
    words: ["これ", "は", "何", "です", "か"],
    explain_viet: "Đây là cái gì?",
  },
  {
    filename: "今日はいい天気ですね.mp3",
    transcript_jp: "今日はいい天気ですね",
    words: ["今日", "は", "いい", "天気", "です", "ね"],
    explain_viet: "Hôm nay trời đẹp nhỉ",
  },
  {
    filename: "会議は3時からです。.mp3",
    transcript_jp: "会議は3時からです。",
    words: ["会議", "は", "3", "時", "から", "です"],
    explain_viet: "Cuộc họp từ 3 giờ",
  },
  {
    filename: "すみません。もう一度お願いします。.mp3",
    transcript_jp: "すみません。もう一度お願いします。",
    words: ["すみません", "もう", "一度", "お願い", "します"],
    explain_viet: "Xin lỗi, nói lại một lần nữa nhé",
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
  const existingSets = await prisma.listening_sets.findMany({
    where: { jlpt_level: level },
    include: { items: true },
  });

  const hasMultipleChoice = existingSets.some(
    (set) => set.items.some((item) => item.exercise_type === "multiple_choice")
  );
  const hasDictation = existingSets.some(
    (set) => set.items.some((item) => item.exercise_type === "dictation")
  );
  const hasSentenceOrdering = existingSets.some(
    (set) => set.items.some((item) => item.exercise_type === "sentence_ordering")
  );

  if (hasMultipleChoice && hasDictation && hasSentenceOrdering) {
    console.log(`All listening exercise types already seeded for ${level}. Skip.`);
    return;
  }

  let set1, set2, set3, set4;

  if (!hasMultipleChoice) {
    set1 = await prisma.listening_sets.create({
      data: {
        title: "Câu giao tiếp cơ bản",
        jlpt_level: level,
        is_published: true,
      },
    });

    set2 = await prisma.listening_sets.create({
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
            exercise_type: "multiple_choice",
            audio_url: `${BASE_AUDIO}/${phrase.filename}`,
            options_json: JSON.stringify(options),
            question: "会話を聞いて、正しい答えを選んでください。",
            transcript_jp: phrase.transcript_jp,
            explain_viet: phrase.explain_viet,
            correct_index: correctIndex,
          },
        });
        itemIndex++;
      }
    }
    console.log(`  ✓ Seeded ${AUDIO_PHRASES.length * 2} Multiple Choice exercises for ${level}`);
  } else {
    console.log(`  - Multiple Choice already exists for ${level}`);
  }

  if (!hasDictation) {
    set3 = await prisma.listening_sets.create({
      data: {
        title: "Luyện nghe viết lại",
        jlpt_level: level,
        is_published: true,
      },
    });

    for (const exercise of DICTATION_EXERCISES) {
      await prisma.listening_items.create({
        data: {
          set_id: set3.set_id,
          exercise_type: "dictation",
          audio_url: `${BASE_AUDIO}/${exercise.filename}`,
          question: "聞こえた内容を書いてください",
          transcript_jp: exercise.transcript_jp,
          explain_viet: exercise.explain_viet,
        },
      });
    }
    console.log(`  ✓ Seeded ${DICTATION_EXERCISES.length} Dictation exercises for ${level}`);
  } else {
    console.log(`  - Dictation already exists for ${level}`);
  }

  if (!hasSentenceOrdering) {
    set4 = await prisma.listening_sets.create({
      data: {
        title: "Luyện sắp xếp câu",
        jlpt_level: level,
        is_published: true,
      },
    });

    for (const exercise of SENTENCE_ORDERING_EXERCISES) {
      await prisma.listening_items.create({
        data: {
          set_id: set4.set_id,
          exercise_type: "sentence_ordering",
          audio_url: `${BASE_AUDIO}/${exercise.filename}`,
          question: "聞こえた内容を正しい順番に並べてください",
          transcript_jp: exercise.transcript_jp,
          explain_viet: exercise.explain_viet,
          words_json: JSON.stringify(exercise.words),
        },
      });
    }
    console.log(`  ✓ Seeded ${SENTENCE_ORDERING_EXERCISES.length} Sentence Ordering exercises for ${level}`);
  } else {
    console.log(`  - Sentence Ordering already exists for ${level}`);
  }

  const count = await prisma.listening_items.count({
    where: { set: { jlpt_level: level } },
  });
  console.log(`Total: ${count} listening items for ${level}`);
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
