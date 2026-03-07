// 📂 src/ai/utils-safe.ts
// 🔥 Global Safe String Converter (Universal/Advisor 공용)

export function toStringSafe(raw: any): string {
  try {
    if (!raw) return "";

    if (typeof raw === "string") return raw.trim();
    if (typeof raw.output === "string") return raw.output.trim();
    if (typeof raw.text === "string") return raw.text.trim();
    if (typeof raw.content === "string") return raw.content.trim();
    if (typeof raw.error === "string") return raw.error.trim();

    return JSON.stringify(raw)
      .replace(/undefined/gi, "")
      .replace(/null/gi, "")
      .trim();
  } catch {
    return "";
  }
}
