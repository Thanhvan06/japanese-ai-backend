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
