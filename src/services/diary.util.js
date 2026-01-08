const MAX_TITLE_LEN = parseInt(process.env.DIARY_TITLE_MAX || "28", 10);

export function compactTitle(title) {
  if (!title) return "";
  return title.length <= MAX_TITLE_LEN ? title : `${title.slice(0, MAX_TITLE_LEN - 1)}…`;
}

export function toPublicUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith("/uploads/") || filePath.startsWith("/static/")) return filePath;
  const idx = filePath.indexOf("/uploads/");
  if (idx >= 0) return filePath.slice(idx);
  return `/uploads/${filePath.split("uploads/")[1] || filePath}`;
}

export const DEFAULT_COVER = "/static/defaults/cover-gray.png";
