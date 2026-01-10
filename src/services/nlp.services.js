import { prisma } from "../prisma.js";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "japanese-corrector";

// ===== GRAMMAR RULES FROM DATABASE =====
async function getGrammarRulesFromDB() {
  try {
    const rules = await prisma.grammar_rules.findMany({
      where: { frequency: { gt: 0 } },
      orderBy: [{ frequency: "desc" }, { jlpt_level: "asc" }],
    });

    return rules.map(rule => ({
      ...rule,
      regex: new RegExp(rule.pattern, "g"),
      suggestions: rule.correct_pattern
        .split(";")
        .map(s => s.trim())
        .filter(Boolean),
    }));
  } catch (err) {
    console.error("DB grammar fetch error:", err);
    return [];
  }
}

async function checkGrammarWithDB(text) {
  const errors = [];
  const rules = await getGrammarRulesFromDB();

  for (const rule of rules) {
    let match;
    while ((match = rule.regex.exec(text)) !== null) {
      errors.push({
        original_word: match[0],
        suggestions: rule.suggestions,
        rule_code: rule.rule_code,
      });
    }
  }
  return errors;
}

// ===== OLLAMA AI CALLS =====
async function callOllama(messages) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1,
        num_ctx: 2048,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}`);
  }

  const data = await res.json();
  return data.message?.content || "";
}

function safeJsonParse(text, fallback) {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

// ===== SPLIT TEXT BY SENTENCE =====
function splitSentences(text) {
  // Tách câu theo dấu chấm tiếng Nhật '。'
  const sentences = text.split('。').filter(s => s.trim());
  return sentences.map(s => s.trim() + '。');
}

// ===== VALIDATE ERRORS =====
function validateErrors(errors) {
  return errors
    .filter(e => {
      if (!e.original_word || !Array.isArray(e.suggestions)) return false;
      
      const word = e.original_word.trim();
      const validSuggestions = e.suggestions.filter(
        s => typeof s === "string" && s.trim() && s.trim() !== word
      );
      
      return validSuggestions.length > 0;
    })
    .map(e => ({
      original_word: e.original_word.trim(),
      suggestions: e.suggestions
        .filter(s => typeof s === "string" && s.trim() && s.trim() !== e.original_word.trim())
        .slice(0, 2),
      rule_code: e.rule_code || null,
    }));
}

// ===== MAIN GRAMMAR CHECK FUNCTION =====
export async function checkGrammar(text) {
  if (!text?.trim()) {
    return { errors: [] };
  }

  // Kiểm tra xem có dấu chấm '。' không
  if (!text.includes('。')) {
    // Chưa có dấu chấm => không check, chỉ trả về empty
    return { errors: [] };
  }

  // Tách thành các câu hoàn chỉnh
  const sentences = splitSentences(text);
  let allErrors = [];

  // Check từng câu một
  for (const sentence of sentences) {
    if (!sentence.trim()) continue;

    // Bước 1: Gọi AI check grammar
    let sentenceErrors = [];
    try {
      const content = await callOllama([
        {
          role: "user",
          content: sentence,
        },
      ]);

      const parsed = safeJsonParse(content, { errors: [] });
      sentenceErrors = Array.isArray(parsed.errors) ? parsed.errors : [];
    } catch (err) {
      console.error("AI grammar check failed:", err);
    }

    // Bước 2: Nếu AI không tìm thấy lỗi, dùng DB fallback
    if (!sentenceErrors || sentenceErrors.length === 0) {
      try {
        sentenceErrors = await checkGrammarWithDB(sentence);
      } catch (err) {
        console.error("DB grammar fallback failed:", err);
        sentenceErrors = [];
      }
    }

    allErrors = allErrors.concat(sentenceErrors);
  }

  // Validate và clean errors
  const validErrors = validateErrors(allErrors);

  return {
    errors: validErrors,
  };
}

// ===== AUTO CORRECTION FUNCTION =====
export async function correctJapanese(text) {
  if (!text?.trim()) {
    return { corrected: "", notes: [] };
  }

  // Kiểm tra xem có dấu chấm '。' không
  if (!text.includes('。')) {
    // Chưa hoàn thành câu => không sửa
    return { corrected: text, notes: [] };
  }

  try {
    const content = await callOllama([
      {
        role: "user",
        content: `修正してください:\n${text}`,
      },
    ]);

    const parsed = safeJsonParse(content, {});
    return {
      corrected: parsed.corrected || text,
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch (err) {
    console.error("Auto-correct failed:", err);
    return { corrected: text, notes: [] };
  }
}