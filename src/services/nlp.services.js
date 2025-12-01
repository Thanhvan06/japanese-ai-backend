import OpenAI from "openai";

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Tạm thời: trả về nguyên văn + metadata đơn giản.
// Sau sẽ thay bằng gọi API NLP thật nếu có DIARY_NLP_PROVIDER=...
export async function correctJapanese(text) {
  if (!text) return { corrected: "", notes: [] };
  // TODO: tích hợp provider (OpenAI/LanguageTool/giin/…)
  return {
    corrected: text, // chưa sửa, chỉ giữ chỗ
    notes: []        // ví dụ: [{type:"spelling", from:"...", to:"..."}]
  };
}

/**
 * Kiểm tra ngữ pháp tiếng Nhật và trả về danh sách lỗi với đề xuất sửa chữa
 * @param {string} text - Văn bản tiếng Nhật cần kiểm tra
 * @returns {Promise<Array>} Mảng các lỗi với format: {start_index, end_index, original_word, suggestions}
 */
export async function checkGrammar(text) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Nếu không có OpenAI API key, trả về mảng rỗng
  if (!openai || !process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not set, returning empty grammar check results");
    return [];
  }

  try {
    const prompt = `Bạn là một chuyên gia ngữ pháp tiếng Nhật. Hãy phân tích văn bản sau và tìm các lỗi ngữ pháp, chính tả, hoặc cách dùng từ không đúng.

Văn bản: "${text}"

Hãy trả về kết quả dưới dạng JSON array, mỗi lỗi có format:
{
  "start_index": số vị trí bắt đầu (0-based),
  "end_index": số vị trí kết thúc (không bao gồm),
  "original_word": "từ/cụm từ bị lỗi",
  "suggestions": ["đề xuất 1", "đề xuất 2", ...]
}

Chỉ trả về JSON array, không có text thêm. Nếu không có lỗi, trả về [].`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Bạn là một chuyên gia ngữ pháp tiếng Nhật. Trả về kết quả dưới dạng JSON array thuần túy, không có markdown hoặc text thêm.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return [];
    }

    // Loại bỏ markdown code blocks nếu có
    const jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const errors = JSON.parse(jsonContent);
    
    // Validate và format kết quả
    if (!Array.isArray(errors)) {
      return [];
    }

    return errors
      .filter((error) => {
        return (
          typeof error.start_index === "number" &&
          typeof error.end_index === "number" &&
          typeof error.original_word === "string" &&
          Array.isArray(error.suggestions) &&
          error.start_index >= 0 &&
          error.end_index > error.start_index &&
          error.end_index <= text.length
        );
      })
      .map((error) => ({
        start_index: error.start_index,
        end_index: error.end_index,
        original_word: error.original_word,
        suggestions: error.suggestions.filter((s) => typeof s === "string" && s.length > 0),
      }));
  } catch (error) {
    console.error("Error checking grammar:", error);
    // Trả về mảng rỗng nếu có lỗi để không làm gián đoạn trải nghiệm người dùng
    return [];
  }
}
