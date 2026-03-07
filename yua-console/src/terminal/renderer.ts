// 📂 src/terminal/renderer.ts

// Remove ANSI color sequences
export function stripAnsi(input: string): string {
  return input.replace(/\u001b\[[0-9;]*m/g, "").replace(/\u001b\[K/g, "");
}

/**
 * Terminal rendering rules:
 * - Remove CR
 * - Clean duplicated sequences
 * - Normalize Unicode
 * - Convert tabs → spaces
 * - Fix excessive newlines
 */
export function renderTerminalText(raw: string): string {
  if (!raw) return "";

  let out = raw;

  // CR 제거
  out = out.replace(/\r/g, "");

  // 중복 ANSI 제거
  out = out.replace(/\x1b\[[0-9;]*m\x1b\[[0-9;]*m/g, "");

  // 탭 → 스페이스 2칸
  out = out.replace(/\t/g, "  ");

  // 3줄 이상 연속 → 2줄로 제한
  out = out.replace(/\n{3,}/g, "\n\n");

  // unicode normalization
  out = out.normalize("NFC");

  return stripAnsi(out).trim();
}
