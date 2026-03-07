// 📂 src/utils/safe-json.ts
export function safeJSON(v: any): string {
  try {
    return JSON.stringify(v ?? {});
  } catch {
    return "{}";
  }
}
