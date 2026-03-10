/**
 * Service để chấm điểm so sánh text người dùng nói với câu mẫu
 */

/**
 * Tính điểm similarity giữa 2 chuỗi tiếng Nhật
 * Sử dụng Levenshtein distance và các phương pháp khác
 * @param {string} reference - Câu mẫu (reference text)
 * @param {string} userText - Text người dùng nói
 * @returns {Object} - Kết quả chấm điểm chi tiết
 */
export function scorePronunciation(reference, userText) {
  if (!reference || !userText) {
    return {
      accuracy: 0,
      similarity: 0,
      errors: [],
      feedback: "Không có dữ liệu để so sánh",
    };
  }

  // Chuẩn hóa text: loại bỏ khoảng trắng, chuyển về lowercase (nếu cần)
  const refNormalized = normalizeJapaneseText(reference);
  const userNormalized = normalizeJapaneseText(userText);

  // Tính Levenshtein distance
  const distance = levenshteinDistance(refNormalized, userNormalized);
  const maxLength = Math.max(refNormalized.length, userNormalized.length);
  const similarity = maxLength > 0 ? (1 - distance / maxLength) * 100 : 0;

  // Tính accuracy dựa trên số ký tự đúng
  const accuracy = calculateAccuracy(refNormalized, userNormalized);

  // Phân tích lỗi
  const errors = analyzeErrors(refNormalized, userNormalized);

  // Tạo feedback
  const feedback = generateFeedback(accuracy, errors);

  return {
    accuracy: Math.round(accuracy * 100) / 100,
    similarity: Math.round(similarity * 100) / 100,
    errors,
    feedback,
    reference: refNormalized,
    userText: userNormalized,
  };
}

/**
 * Chuẩn hóa text tiếng Nhật
 * Loại bỏ khoảng trắng, dấu câu không cần thiết
 */
function normalizeJapaneseText(text) {
  if (!text) return "";
  return text
    .trim()
    .replace(/\s+/g, "") // Loại bỏ tất cả khoảng trắng
    .replace(/[。、！？]/g, ""); // Loại bỏ dấu câu tiếng Nhật
}

/**
 * Tính Levenshtein distance giữa 2 chuỗi
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Tính accuracy dựa trên số ký tự đúng
 */
function calculateAccuracy(reference, userText) {
  if (!reference || !userText) return 0;

  let correctChars = 0;
  const minLength = Math.min(reference.length, userText.length);
  const maxLength = Math.max(reference.length, userText.length);

  // Đếm số ký tự đúng ở vị trí tương ứng
  for (let i = 0; i < minLength; i++) {
    if (reference[i] === userText[i]) {
      correctChars++;
    }
  }

  // Tính accuracy: (số ký tự đúng / độ dài chuỗi dài hơn) * 100
  return (correctChars / maxLength) * 100;
}

/**
 * Phân tích lỗi chi tiết
 */
function analyzeErrors(reference, userText) {
  const errors = [];
  const minLength = Math.min(reference.length, userText.length);

  for (let i = 0; i < minLength; i++) {
    if (reference[i] !== userText[i]) {
      errors.push({
        position: i,
        expected: reference[i],
        actual: userText[i],
      });
    }
  }

  // Nếu độ dài khác nhau, thêm lỗi về thiếu/thừa ký tự
  if (reference.length > userText.length) {
    errors.push({
      position: userText.length,
      expected: reference.substring(userText.length),
      actual: "",
      type: "missing",
    });
  } else if (userText.length > reference.length) {
    errors.push({
      position: reference.length,
      expected: "",
      actual: userText.substring(reference.length),
      type: "extra",
    });
  }

  return errors;
}

/**
 * Tạo feedback dựa trên accuracy và errors
 */
function generateFeedback(accuracy, errors) {
  if (accuracy >= 95) {
    return "Xuất sắc! Phát âm rất chính xác.";
  } else if (accuracy >= 85) {
    return "Tốt! Hãy chú ý một số chi tiết nhỏ.";
  } else if (accuracy >= 70) {
    return "Khá tốt, nhưng cần luyện thêm để cải thiện.";
  } else if (accuracy >= 50) {
    return "Cần luyện tập thêm. Hãy nghe mẫu và lặp lại.";
  } else {
    return "Hãy nghe mẫu kỹ và thử lại. Chú ý từng âm tiết.";
  }
}

/**
 * So sánh từng từ (word-level comparison) - nâng cao hơn
 */
export function scorePronunciationAdvanced(reference, userText) {
  const basicScore = scorePronunciation(reference, userText);

  // Tách thành từ (nếu có khoảng trắng hoặc dấu phân cách)
  const refWords = reference.split(/\s+/).filter((w) => w.length > 0);
  const userWords = userText.split(/\s+/).filter((w) => w.length > 0);

  // Tính word-level accuracy
  let correctWords = 0;
  const minWords = Math.min(refWords.length, userWords.length);
  for (let i = 0; i < minWords; i++) {
    if (refWords[i] === userWords[i]) {
      correctWords++;
    }
  }

  const wordAccuracy =
    refWords.length > 0 ? (correctWords / refWords.length) * 100 : 0;

  return {
    ...basicScore,
    wordAccuracy: Math.round(wordAccuracy * 100) / 100,
    wordCount: {
      reference: refWords.length,
      user: userWords.length,
      correct: correctWords,
    },
  };
}


