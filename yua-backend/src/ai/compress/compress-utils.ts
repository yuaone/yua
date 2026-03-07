// 📂 src/ai/compress/compress-utils.ts
// 🔧 Compress Utilities — CLEAN / CHUNK / TOKEN SAFE
// -------------------------------------------------------------

// 기본 텍스트 정리 (공백/중복 제거)
export function cleanText(text: string): string {
  if (!text) return "";

  return text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/ +/g, " ")
    .trim();
}

// 긴 텍스트 chunk 분리
export function splitChunks(text: string, limit = 3000): string[] {
  const chunks: string[] = [];
  let pointer = 0;

  while (pointer < text.length) {
    chunks.push(text.slice(pointer, pointer + limit));
    pointer += limit;
  }

  return chunks;
}
