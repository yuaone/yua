export function normalizeInput(text: string) {
  if (!text) return "";
  return text
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .trim();
}

export function buildCausalLinks(text: string) {
  return [
    { cause: text, effect: "Impact A" },
    { cause: text, effect: "Impact B" }
  ];
}
