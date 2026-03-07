// 📂 src/ai/utils/utils-safe.ts
// 🔥 YUA-AI UtilsSafe — FINAL (TS5 / Node20)

export function safeToString(value: unknown): string {
  if (value == null) return "";

  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    if (Number.isNaN(value)) return "";
    return String(value);
  }

  if (value instanceof Error) {
    return value.message || value.name || "Error";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

export function safeJsonParse<T>(input: unknown, fallback: T): T {
  if (typeof input !== "string") return fallback;

  try {
    const parsed = JSON.parse(input) as T;
    return parsed;
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(input: unknown, space = 0): string {
  try {
    return JSON.stringify(input, null, space);
  } catch {
    // 순환 참조 등 방어
    return `"[unserializable]"`;
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function toNonEmptyString(value: unknown, fallback = ""): string {
  const s = safeToString(value).trim();
  return s.length > 0 ? s : fallback;
}
