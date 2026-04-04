import { prisma } from "../prisma.js";

/**
 * @param {number} userId
 * @returns {Promise<object>}
 */
export async function loadPracticeProgressForUser(userId) {
  const [
    rTotal,
    rCorrect,
    rDistinct,
    lTotal,
    lCorrect,
    lDistinct,
    sTotal,
    sAvg,
    readingRecent,
    listeningRecent,
    speakingRecent,
  ] = await Promise.all([
    prisma.reading_attempts.count({ where: { user_id: userId } }),
    prisma.reading_attempts.count({
      where: { user_id: userId, is_correct: true },
    }),
    prisma.reading_attempts
      .groupBy({
        by: ["item_id"],
        where: { user_id: userId },
      })
      .then((rows) => rows.length),
    prisma.listening_attempts.count({ where: { user_id: userId } }),
    prisma.listening_attempts.count({
      where: { user_id: userId, is_correct: true },
    }),
    prisma.listening_attempts
      .groupBy({
        by: ["item_id"],
        where: { user_id: userId },
      })
      .then((rows) => rows.length),
    prisma.speaking_attempts.count({ where: { user_id: userId } }),
    prisma.speaking_attempts
      .aggregate({
        where: { user_id: userId },
        _avg: { accuracy_score: true },
      })
      .then((a) => a._avg.accuracy_score ?? null),
    prisma.reading_attempts.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 25,
      include: {
        item: {
          include: {
            set: { select: { title: true, jlpt_level: true } },
          },
        },
      },
    }),
    prisma.listening_attempts.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 25,
      include: {
        item: {
          include: {
            set: { select: { title: true, jlpt_level: true } },
          },
        },
      },
    }),
    prisma.speaking_attempts.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: 25,
      include: {
        speaking_phrases: {
          select: {
            jp: true,
            jlpt_level: true,
            topic: true,
          },
        },
      },
    }),
  ]);

  const rWrong = rTotal - rCorrect;
  const lWrong = lTotal - lCorrect;

  return {
    reading: {
      totalAttempts: rTotal,
      correctAttempts: rCorrect,
      wrongAttempts: rWrong,
      distinctItems: rDistinct,
      accuracyPercent:
        rTotal > 0 ? Math.round((rCorrect / rTotal) * 1000) / 10 : null,
      recent: readingRecent.map((a) => ({
        attempt_id: a.attempt_id,
        is_correct: a.is_correct,
        created_at: a.created_at,
        item_id: a.item_id,
        exercise_type: a.item?.exercise_type ?? null,
        set_title: a.item?.set?.title ?? null,
        jlpt_level: a.item?.set?.jlpt_level ?? null,
      })),
    },
    listening: {
      totalAttempts: lTotal,
      correctAttempts: lCorrect,
      wrongAttempts: lWrong,
      distinctItems: lDistinct,
      accuracyPercent:
        lTotal > 0 ? Math.round((lCorrect / lTotal) * 1000) / 10 : null,
      recent: listeningRecent.map((a) => ({
        attempt_id: a.attempt_id,
        is_correct: a.is_correct,
        created_at: a.created_at,
        item_id: a.item_id,
        exercise_type: a.item?.exercise_type ?? null,
        set_title: a.item?.set?.title ?? null,
        jlpt_level: a.item?.set?.jlpt_level ?? null,
      })),
    },
    speaking: {
      totalAttempts: sTotal,
      avgAccuracy: sAvg != null ? Math.round(sAvg * 10) / 10 : null,
      recent: speakingRecent.map((a) => ({
        attempt_id: a.attempt_id,
        accuracy_score: a.accuracy_score,
        created_at: a.created_at,
        phrase_id: a.phrase_id,
        phrase_jp: a.speaking_phrases?.jp ?? null,
        jlpt_level: a.speaking_phrases?.jlpt_level ?? null,
        topic: a.speaking_phrases?.topic ?? null,
      })),
    },
  };
}
