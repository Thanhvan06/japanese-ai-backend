import { prisma } from "../prisma.js";
import { transcribeAudio } from "../services/stt.service.js";
import { scorePronunciation, scorePronunciationAdvanced } from "../services/scoring.service.js";
import { generateAudioFromText } from "../services/tts.service.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * GET /api/speaking/phrases
 * Lấy danh sách câu mẫu để luyện nói
 */
export const getSpeakingPhrases = async (req, res, next) => {
  try {
    const { level, topic, limit = 50, offset = 0 } = req.query;

    // Kiểm tra prisma client có model speaking_phrases không
    if (!prisma.speaking_phrases) {
      return res.status(500).json({ 
        message: "Prisma client chưa được generate. Vui lòng chạy: npx prisma generate",
        error: "speaking_phrases model not found in Prisma client"
      });
    }

    const where = {
      is_published: true,
    };

    if (level) {
      where.jlpt_level = level;
    }

    if (topic) {
      where.topic = topic;
    }

    const phrases = await prisma.speaking_phrases.findMany({
      where,
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { created_at: "desc" },
    });

    return res.json({
      phrases,
      total: phrases.length,
    });
  } catch (err) {
    console.error("Error in getSpeakingPhrases:", err);
    // Kiểm tra nếu lỗi do bảng/model chưa tồn tại (chưa db push / generate)
    if (err.message && (err.message.includes("speaking_phrases") || err.message.includes("Unknown model"))) {
      return res.status(500).json({ 
        message: "Database chưa đồng bộ schema hoặc Prisma client chưa generate. Dev: npx prisma db push && npx prisma generate",
        error: err.message 
      });
    }
    next(err);
  }
};

/**
 * GET /api/speaking/phrases/:id
 * Lấy chi tiết một câu mẫu
 */
export const getSpeakingPhraseDetail = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "phraseId không hợp lệ" });
    }

    const phrase = await prisma.speaking_phrases.findUnique({
      where: { phrase_id: id },
    });

    if (!phrase) {
      return res.status(404).json({ message: "Không tìm thấy câu mẫu" });
    }

    return res.json(phrase);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/speaking/phrases/:id/generate-audio
 * Generate audio cho câu mẫu nếu chưa có
 */
export const generatePhraseAudio = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "phraseId không hợp lệ" });
    }

    const phrase = await prisma.speaking_phrases.findUnique({
      where: { phrase_id: id },
    });

    if (!phrase) {
      return res.status(404).json({ message: "Không tìm thấy câu mẫu" });
    }

    // Nếu đã có audio, trả về luôn
    if (phrase.audio_url) {
      return res.json({
        audioUrl: phrase.audio_url,
        message: "Audio đã tồn tại",
      });
    }

    // Generate audio mới
    try {
      const outputFilename = `speaking-phrase-${id}`;
      const result = await generateAudioFromText(phrase.jp, outputFilename);

      // Cập nhật audio_url vào database
      await prisma.speaking_phrases.update({
        where: { phrase_id: id },
        data: { audio_url: result.url },
      });

      return res.json({
        audioUrl: result.url,
        message: "Đã generate audio thành công",
      });
    } catch (ttsError) {
      console.error("Error generating audio:", ttsError);
      return res.status(500).json({
        message: "Lỗi khi generate audio",
        error: ttsError.message,
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/speaking/practice
 * Upload audio, transcribe và chấm điểm
 * Body: multipart/form-data với file audio và phraseId
 */
export const practiceSpeaking = async (req, res, next) => {
  try {
    const phraseId = req.body?.phraseId || req.query?.phraseId;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({ message: "Không có file audio được upload" });
    }

    if (!phraseId) {
      return res.status(400).json({ message: "Thiếu phraseId" });
    }

    const phraseIdNum = Number(phraseId);
    if (Number.isNaN(phraseIdNum)) {
      return res.status(400).json({ message: "phraseId không hợp lệ" });
    }

    // Lấy câu mẫu từ database
    const phrase = await prisma.speaking_phrases.findUnique({
      where: { phrase_id: phraseIdNum },
    });

    if (!phrase) {
      // Xóa file đã upload nếu không tìm thấy phrase
      if (audioFile.path && fs.existsSync(audioFile.path)) {
        fs.unlinkSync(audioFile.path);
      }
      return res.status(404).json({ message: "Không tìm thấy câu mẫu" });
    }

    // Lấy user_id từ token (nếu có)
    const userId = req.user?.user_id || null;

    try {
      // Kiểm tra file audio có tồn tại không
      if (!fs.existsSync(audioFile.path)) {
        throw new Error("File audio không tồn tại sau khi upload");
      }

      // 1. Transcribe audio thành text
      console.log("Đang transcribe audio từ file:", audioFile.path);
      let transcribedText;
      try {
        transcribedText = await transcribeAudio(audioFile.path);
      } catch (transcribeError) {
        console.error("Lỗi transcribe:", transcribeError);
        // Xóa file nếu có lỗi
        if (audioFile.path && fs.existsSync(audioFile.path)) {
          try {
            fs.unlinkSync(audioFile.path);
          } catch (e) {
            console.error("Lỗi khi xóa file:", e);
          }
        }
        throw new Error(`Lỗi transcribe audio: ${transcribeError.message}`);
      }

      // 2. Chấm điểm so sánh với câu mẫu
      console.log("Đang chấm điểm...");
      const scoreResult = scorePronunciationAdvanced(phrase.jp, transcribedText);

      // 3. Tạo URL cho audio file
      const baseUrl = process.env.BASE_URL || "http://localhost:4000";
      const audioUrl = `${baseUrl}/uploads/audio/${audioFile.filename}`;

      // 4. Lưu attempt vào database (nếu có user)
      let attempt = null;
      if (userId) {
        attempt = await prisma.speaking_attempts.create({
          data: {
            user_id: userId,
            phrase_id: phraseIdNum,
            audio_url: audioUrl,
            transcribed_text: transcribedText,
            accuracy_score: scoreResult.accuracy,
            details_json: JSON.stringify(scoreResult),
          },
        });
      }

      // 5. Trả về kết quả
      return res.json({
        success: true,
        phrase: {
          id: phrase.phrase_id,
          jp: phrase.jp,
          romaji: phrase.romaji,
          vi: phrase.vi,
        },
        transcribedText,
        score: {
          accuracy: scoreResult.accuracy,
          similarity: scoreResult.similarity,
          wordAccuracy: scoreResult.wordAccuracy,
          feedback: scoreResult.feedback,
          errors: scoreResult.errors,
        },
        audioUrl,
        attemptId: attempt?.attempt_id || null,
      });
    } catch (error) {
      // Xóa file nếu có lỗi
      if (audioFile.path && fs.existsSync(audioFile.path)) {
        try {
          fs.unlinkSync(audioFile.path);
        } catch (e) {
          console.error("Lỗi khi xóa file:", e);
        }
      }
      throw error;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/speaking/attempts
 * Lấy lịch sử luyện nói của user
 */
export const getSpeakingAttempts = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const { limit = 20, offset = 0 } = req.query;

    const attempts = await prisma.speaking_attempts.findMany({
      where: { user_id: userId },
      include: {
        speaking_phrases: {
          select: {
            phrase_id: true,
            jp: true,
            romaji: true,
            vi: true,
            topic: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    return res.json({
      attempts,
      total: attempts.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/speaking/stats
 * Lấy thống kê luyện nói của user
 */
export const getSpeakingStats = async (req, res, next) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const totalAttempts = await prisma.speaking_attempts.count({
      where: { user_id: userId },
    });

    const avgScore = await prisma.speaking_attempts.aggregate({
      where: { user_id: userId },
      _avg: {
        accuracy_score: true,
      },
    });

    // Lấy attempts gần đây với thông tin phrase
    const recentAttempts = await prisma.speaking_attempts.findMany({
      where: { user_id: userId },
      include: {
        speaking_phrases: {
          select: {
            phrase_id: true,
            jp: true,
            romaji: true,
            topic: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: 10,
    });

    // Thống kê theo ngày (7 ngày gần đây)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Lấy tất cả attempts trong 7 ngày qua
    const recentAttemptsForStats = await prisma.speaking_attempts.findMany({
      where: {
        user_id: userId,
        created_at: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        accuracy_score: true,
        created_at: true,
      },
    });

    // Nhóm theo ngày
    const dailyProgress = {};
    recentAttemptsForStats.forEach((attempt) => {
      const date = new Date(attempt.created_at);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split("T")[0];

      if (!dailyProgress[dateKey]) {
        dailyProgress[dateKey] = {
          date: dateKey,
          count: 0,
          totalScore: 0,
        };
      }
      dailyProgress[dateKey].count += 1;
      dailyProgress[dateKey].totalScore += attempt.accuracy_score || 0;
    });

    // Tính average và tạo array
    const dailyProgressArray = Object.values(dailyProgress)
      .map((day) => ({
        date: day.date,
        count: day.count,
        avgScore: day.count > 0 ? day.totalScore / day.count : 0,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 7);

    const todayKey = new Date().toISOString().split("T")[0];
    const todayStats = dailyProgress[todayKey];

    return res.json({
      totalAttempts,
      todayAttempts: todayStats ? todayStats.count : 0,
      averageScore: avgScore._avg.accuracy_score || 0,
      recentAttempts: recentAttempts.map((a) => ({
        attemptId: a.attempt_id,
        score: a.accuracy_score,
        date: a.created_at,
        phrase: a.speaking_phrases
          ? {
              id: a.speaking_phrases.phrase_id,
              jp: a.speaking_phrases.jp,
              romaji: a.speaking_phrases.romaji,
              topic: a.speaking_phrases.topic,
            }
          : null,
      })),
      dailyProgress: dailyProgressArray,
    });
  } catch (err) {
    next(err);
  }
};

const SPEAKING_PASS_SCORE = 80;

/**
 * GET /api/speaking/progress?level=N5
 * Tiến độ theo từng câu mẫu trong cấp độ (cần token để có dữ liệu).
 */
export const getSpeakingProgress = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.json({ byPhrase: {} });
    }

    const { level } = req.query;
    if (!level) {
      return res.status(400).json({ message: "Thiếu tham số level" });
    }

    const phrases = await prisma.speaking_phrases.findMany({
      where: { jlpt_level: level, is_published: true },
      select: { phrase_id: true },
    });
    const phraseIds = phrases.map((p) => p.phrase_id);
    if (phraseIds.length === 0) {
      return res.json({ byPhrase: {} });
    }

    const attempts = await prisma.speaking_attempts.findMany({
      where: {
        user_id: req.user.user_id,
        phrase_id: { in: phraseIds },
      },
      orderBy: { created_at: "asc" },
      select: {
        phrase_id: true,
        accuracy_score: true,
        created_at: true,
      },
    });

    const byPhrase = {};
    for (const a of attempts) {
      const pid = a.phrase_id;
      const score = Number(a.accuracy_score) || 0;
      if (!byPhrase[pid]) {
        byPhrase[pid] = {
          attempted: true,
          attemptCount: 0,
          bestScore: 0,
          lastScore: null,
          lastAttemptAt: null,
          passed: false,
        };
      }
      const row = byPhrase[pid];
      row.attemptCount += 1;
      row.bestScore = Math.max(row.bestScore, score);
      row.lastScore = score;
      row.lastAttemptAt = a.created_at;
      row.passed = row.bestScore >= SPEAKING_PASS_SCORE;
    }

    return res.json({ byPhrase });
  } catch (err) {
    next(err);
  }
};

// ADMIN ENDPOINTS

export const getAdminSpeakingPhrases = async (req, res, next) => {
  try {
    const { level, topic, page = 1, limit = 20 } = req.query;

    if (!prisma.speaking_phrases) {
      return res.status(500).json({
        message:
          "Prisma client chưa được generate. Vui lòng chạy: npx prisma generate",
        error: "speaking_phrases model not found in Prisma client",
      });
    }

    const where = {};
    if (level) {
      where.jlpt_level = level;
    }
    if (topic) {
      where.topic = topic;
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Number(limit) || 20);

    const [phrases, total] = await Promise.all([
      prisma.speaking_phrases.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.speaking_phrases.count({ where }),
    ]);

    const phraseIds = phrases.map((p) => p.phrase_id);
    let statsByPhrase = {};

    if (phraseIds.length > 0) {
      const attempts = await prisma.speaking_attempts.findMany({
        where: { phrase_id: { in: phraseIds } },
        select: {
          phrase_id: true,
          accuracy_score: true,
        },
      });

      statsByPhrase = attempts.reduce((acc, a) => {
        if (!acc[a.phrase_id]) {
          acc[a.phrase_id] = { total: 0, sumScore: 0 };
        }
        acc[a.phrase_id].total += 1;
        acc[a.phrase_id].sumScore += a.accuracy_score || 0;
        return acc;
      }, {});
    }

    const items = phrases.map((p) => {
      const stats = statsByPhrase[p.phrase_id] || {
        total: 0,
        sumScore: 0,
      };
      const avgScore =
        stats.total > 0 ? Math.round(stats.sumScore / stats.total) : 0;
      return {
        phrase_id: p.phrase_id,
        jp: p.jp,
        romaji: p.romaji,
        vi: p.vi,
        topic: p.topic,
        jlpt_level: p.jlpt_level,
        is_published: p.is_published,
        audio_url: p.audio_url,
        created_at: p.created_at,
        attempts: stats.total,
        averageScore: avgScore,
      };
    });

    return res.json({ items, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
};

export const createAdminSpeakingPhrase = async (req, res, next) => {
  try {
    const { jp, romaji, vi, topic, jlpt_level, is_published } = req.body;

    if (!jp || !vi) {
      return res.status(400).json({ message: "Thiếu jp hoặc vi" });
    }

    const created = await prisma.speaking_phrases.create({
      data: {
        jp,
        romaji: romaji || null,
        vi,
        topic: topic || null,
        jlpt_level: jlpt_level || null,
        is_published: is_published !== undefined ? Boolean(is_published) : true,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const updateAdminSpeakingPhrase = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "phraseId không hợp lệ" });
    }

    const { jp, romaji, vi, topic, jlpt_level, is_published, audio_url } =
      req.body;
    const data = {};

    if (jp !== undefined) data.jp = jp;
    if (romaji !== undefined) data.romaji = romaji;
    if (vi !== undefined) data.vi = vi;
    if (topic !== undefined) data.topic = topic;
    if (jlpt_level !== undefined) data.jlpt_level = jlpt_level;
    if (is_published !== undefined) {
      data.is_published = Boolean(is_published);
    }
    if (audio_url !== undefined) data.audio_url = audio_url;

    const updated = await prisma.speaking_phrases.update({
      where: { phrase_id: id },
      data,
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteAdminSpeakingPhrase = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "phraseId không hợp lệ" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.speaking_attempts.deleteMany({
        where: { phrase_id: id },
      });
      await tx.speaking_phrases.delete({
        where: { phrase_id: id },
      });
    });

    return res.json({ message: "Đã xóa câu luyện nói" });
  } catch (err) {
    next(err);
  }
};

export const getAdminSpeakingStatsOverview = async (req, res, next) => {
  try {
    const { level, topic } = req.query;

    const wherePhrase = {};
    if (level) {
      wherePhrase.jlpt_level = level;
    }
    if (topic) {
      wherePhrase.topic = topic;
    }

    const phrases = await prisma.speaking_phrases.findMany({
      where: wherePhrase,
      select: {
        phrase_id: true,
        jp: true,
        vi: true,
        topic: true,
      },
    });

    const phraseIds = phrases.map((p) => p.phrase_id);
    if (phraseIds.length === 0) {
      return res.json({
        totalPhrases: 0,
        totalAttempts: 0,
        averageScore: 0,
        hardestPhrases: [],
      });
    }

    const attempts = await prisma.speaking_attempts.findMany({
      where: { phrase_id: { in: phraseIds } },
      select: {
        phrase_id: true,
        accuracy_score: true,
      },
    });

    const byPhrase = attempts.reduce((acc, a) => {
      if (!acc[a.phrase_id]) {
        acc[a.phrase_id] = { total: 0, sumScore: 0 };
      }
      acc[a.phrase_id].total += 1;
      acc[a.phrase_id].sumScore += a.accuracy_score || 0;
      return acc;
    }, {});

    let totalAttempts = 0;
    let sumAllScores = 0;

    const withStats = phrases.map((p) => {
      const stats = byPhrase[p.phrase_id] || {
        total: 0,
        sumScore: 0,
      };
      totalAttempts += stats.total;
      sumAllScores += stats.sumScore;
      const avgScore =
        stats.total > 0 ? Math.round(stats.sumScore / stats.total) : 0;
      return {
        phrase_id: p.phrase_id,
        jp: p.jp,
        vi: p.vi,
        topic: p.topic,
        attempts: stats.total,
        averageScore: avgScore,
      };
    });

    const averageScore =
      totalAttempts > 0 ? Math.round(sumAllScores / totalAttempts) : 0;

    const hardestPhrases = withStats
      .filter((p) => p.attempts >= 5)
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 5);

    return res.json({
      totalPhrases: phrases.length,
      totalAttempts,
      averageScore,
      hardestPhrases,
    });
  } catch (err) {
    next(err);
  }
};


