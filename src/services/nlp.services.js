import kuromoji from "kuromoji";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2:1.5b";
const KUROMOJI_DICT =
  process.env.KUROMOJI_DICT_PATH || "node_modules/kuromoji/dict";

let tokenizerPromise = null;
function getTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath: KUROMOJI_DICT }).build((err, tokenizer) => {
        if (err) {
          console.error("Kuromoji build error:", err);
          return reject(err);
        }
        resolve(tokenizer);
      });
    });
  }
  return tokenizerPromise;
}

async function tokenizeWithFurigana(text) {
  try {
    const tokenizer = await getTokenizer();
    const tokens = tokenizer.tokenize(text || "");
    return tokens.map((t) => ({
      surface: t.surface_form,
      reading: t.reading || t.surface_form,
      pos: t.pos,
    }));
  } catch (err) {
    console.error("Tokenize error:", err);
    return [];
  }
}

async function callOllama(messages) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: { temperature: 0.2 },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  return data.message?.content?.trim() || "";
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export async function correctJapanese(text) {
  if (!text) return { corrected: "", notes: [], furigana: [] };

  const furigana = await tokenizeWithFurigana(text);
  try {
    const prompt = `Bạn là trợ lý chỉnh sửa tiếng Nhật. Sửa chính tả/ ngữ pháp/ văn phong, giữ nguyên ý nghĩa và ngắn gọn, không giải thích.
Trả về JSON:
{
  "corrected": "văn bản đã sửa",
  "notes": ["ghi chú ngắn về thay đổi..."]
}
Chỉ trả JSON.`;

    const content = await callOllama([
      { role: "system", content: "Bạn chỉnh sửa tiếng Nhật, trả JSON thuần." },
      { role: "user", content: `${prompt}\nVăn bản: """${text}"""` },
    ]);

    const cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = safeJsonParse(cleaned, {});

    const corrected =
      typeof parsed.corrected === "string" && parsed.corrected.length > 0
        ? parsed.corrected
        : text;
    const notes = Array.isArray(parsed.notes)
      ? parsed.notes.filter((n) => typeof n === "string" && n.length > 0)
      : [];

    return { corrected, notes, furigana };
  } catch (err) {
    console.error("correctJapanese error:", err);
    return { corrected: text, notes: [], furigana };
  }
}

/**
 * Kiểm tra ngữ pháp tiếng Nhật và trả về danh sách lỗi với đề xuất sửa chữa
 * @param {string} text - Văn bản tiếng Nhật cần kiểm tra
 * @returns {Promise<Array>} Mảng lỗi: {start_index, end_index, original_word, suggestions}
 */
export async function checkGrammar(text) {
  const furigana = await tokenizeWithFurigana(text || "");
  if (!text || text.trim().length === 0) {
    return { errors: [], furigana, natural_sentences: [] };
  }

  try {
    const tokensForPrompt = furigana
      .map((t) => `${t.surface}/${t.reading}/${t.pos}`)
      .join(" ");

    const prompt = `Bạn là chuyên gia ngữ pháp tiếng Nhật.
Phân tích bằng Kuromoji tokens (surface/reading/pos): ${tokensForPrompt}
Phát hiện lỗi ngữ pháp, lỗi từ vựng, lỗi ngữ cảnh.
Đề xuất câu tự nhiên hơn nhưng giữ nguyên ý (tối đa 2).
Trả về JSON:
{
  "errors": [
    {
      "start_index": number (0-based),
      "end_index": number (exclusive),
      "original_word": "chuỗi gốc",
      "suggestions": ["đề xuất 1", "đề xuất 2"]
    }
  ],
  "natural_sentences": ["câu gợi ý 1", "câu gợi ý 2"]
}
Chỉ trả JSON, không markdown. Nếu không có lỗi, errors = []. Văn bản:
"""${text}"""`;

    const content = await callOllama([
      { role: "system", content: "Trả về JSON array thuần, không chú thích." },
      { role: "user", content: prompt },
    ]);

    const cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = safeJsonParse(cleaned, {});

    const rawErrors = Array.isArray(parsed.errors) ? parsed.errors : [];
    const natural = Array.isArray(parsed.natural_sentences)
      ? parsed.natural_sentences
      : [];

    const errors = rawErrors
      .filter(
        (e) =>
          typeof e.start_index === "number" &&
          typeof e.end_index === "number" &&
          e.start_index >= 0 &&
          e.end_index > e.start_index &&
          e.end_index <= text.length &&
          typeof e.original_word === "string"
      )
      .map((e) => ({
        start_index: e.start_index,
        end_index: e.end_index,
        original_word: e.original_word,
        suggestions: Array.isArray(e.suggestions)
          ? e.suggestions.filter(
              (s) => typeof s === "string" && s.trim().length > 0
            )
          : [],
      }));

    const natural_sentences = natural
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .slice(0, 2);

    return { errors, furigana, natural_sentences };
  } catch (error) {
    console.error("Error checking grammar:", error);
    return { errors: [], furigana, natural_sentences: [] };
  }
}
