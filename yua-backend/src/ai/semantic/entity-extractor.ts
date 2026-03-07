// 🔥 YUA Entity Extractor — Deterministic (No Hardcoding)
// --------------------------------------------------------

export function extractEntities(message: string): string[] {
  if (!message) return [];

  const candidates = new Set<string>();

  // 1️⃣ English Proper Nouns (PascalCase / Capitalized words)
  const englishProper = message.match(/\b[A-Z][a-zA-Z0-9]{2,}\b/g);
  englishProper?.forEach(w => candidates.add(w));

  // 2️⃣ Korean noun-like tokens (2~10 length blocks)
  const koreanBlocks = message.match(/[가-힣]{2,10}/g);
  koreanBlocks?.forEach(w => {
    if (w.length >= 2) candidates.add(w);
  });

  // 3️⃣ Mixed alphanumeric (e.g., GPT4, V1, 총균쇠2)
  const mixed = message.match(/\b[a-zA-Z가-힣]*\d+[a-zA-Z가-힣]*\b/g);
  mixed?.forEach(w => candidates.add(w));

  return Array.from(candidates).slice(0, 6);
}