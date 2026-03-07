// 📂 src/ai/hpe/hpe7/memory-utils.ts
// ------------------------------------------------------
// Utility: Tag Extraction from Input/Output
// ------------------------------------------------------

export function extractTags(text: string): string[] {
  if (!text) return [];
  const clean = text.toLowerCase().replace(/[^a-z0-9가-힣\s]/g, "");
  const tokens = clean.split(/\s+/).filter(Boolean);

  const important = tokens.filter(t =>
    t.length > 1 && t.length <= 12
  );

  return [...new Set(important)].slice(0, 10);
}
