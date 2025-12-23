import kuromoji from "kuromoji";
import { prisma } from "../prisma.js";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "japanese-corrector";
const KUROMOJI_DICT =
  process.env.KUROMOJI_DICT_PATH || "node_modules/kuromoji/dict";

/* =====================================================
   KUROMOJI TOKENIZER
===================================================== */
let tokenizerPromise = null;

function getTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji
        .builder({ dicPath: KUROMOJI_DICT })
        .build((err, tokenizer) => {
          if (err) return reject(err);
          resolve(tokenizer);
        });
    });
  }
  return tokenizerPromise;
}

async function tokenizeWithFurigana(text) {
  try {
    const tokenizer = await getTokenizer();
    return tokenizer.tokenize(text).map(t => ({
      surface: t.surface_form,
      reading: t.reading || t.surface_form,
    }));
  } catch (err) {
    console.error("Kuromoji error:", err);
    return [];
  }
}

/* =====================================================
   DB GRAMMAR RULES (FALLBACK ONLY)
===================================================== */
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
    const match = rule.regex.exec(text);
    if (!match) continue;

    errors.push({
      original_word: match[0],
      suggestions: rule.suggestions,
      rule_code: rule.rule_code,
    });
  }
  return errors;
}

/* =====================================================
   OLLAMA CALL (NO SYSTEM OVERRIDE)
===================================================== */
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

/* =====================================================
   SAFE JSON PARSE (MINIMAL)
===================================================== */
function safeJsonParse(text, fallback) {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

/* =====================================================
   CHECK GRAMMAR (AI FIRST, DB FALLBACK)
===================================================== */
export async function checkGrammar(text) {
  if (!text?.trim()) {
    return { errors: [], furigana: [] };
  }

  /* Furigana */
  const furigana = await tokenizeWithFurigana(text);

  /* ================= AI CHECK ================= */
  let aiErrors = [];
  try {
    const content = await callOllama([
      {
        role: "user",
        content: text, // ⚠️ RAW TEXT ONLY
      },
    ]);

    const parsed = safeJsonParse(content, { errors: [] });
    aiErrors = Array.isArray(parsed.errors) ? parsed.errors : [];
  } catch (err) {
    console.error("AI grammar check failed:", err);
  }

  /* ================= DB FALLBACK ================= */
  let finalErrors = aiErrors;

  if (!finalErrors || finalErrors.length === 0) {
    try {
      finalErrors = await checkGrammarWithDB(text);
    } catch (err) {
      console.error("DB grammar fallback failed:", err);
      finalErrors = [];
    }
  }

  return {
    errors: finalErrors,
    furigana,
  };
}

/* =====================================================
   AUTO CORRECT (CORRECTION MODE)
===================================================== */
export async function correctJapanese(text) {
  if (!text?.trim()) {
    return { corrected: "", notes: [], furigana: [] };
  }

  const furigana = await tokenizeWithFurigana(text);

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
      furigana,
    };
  } catch (err) {
    console.error("Auto-correct failed:", err);
    return { corrected: text, notes: [], furigana };
  }
}
