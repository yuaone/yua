// src/ai/vkr/extractor.ts

export function extractRelevantText(
  content: string,
  query: string
): string {
  const q = query.toLowerCase();
  return content
    .split("\n")
    .filter(line => line.toLowerCase().includes(q))
    .slice(0, 5)
    .join(" ");
}
