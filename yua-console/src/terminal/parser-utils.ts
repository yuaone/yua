/**
 * YUA ONE — Terminal Parser Utils (SSOT 3.0 Final)
 * Bash / QGML 자동 분류 + 위험 명령 탐지 + normalization
 */

//
// 1. Bash 명령어 식별 (정확도 상승)
// ----------------------------------------------------------
export function isBashCommand(text: string): boolean {
  if (!text) return false;

  const trimmed = text.trim();

  // Bash는 “keyword + args” 형태가 많음
  // QGML namespace.method() 패턴을 제외해야 함
  if (trimmed.match(/[a-zA-Z_]+\.[a-zA-Z_]+\(/)) return false;

  // 명령어 + 옵션: ls -al, cat file.txt
  return /^[a-zA-Z][a-zA-Z0-9_\-]*(\s|$)/.test(trimmed);
}

//
// 2. QGML Script Detection — QGML 10.0 완전 대응
// ----------------------------------------------------------
export function isQGML(text: string): boolean {
  if (!text) return false;
  const t = text.trim();

  // 핵심 키워드 기반 (QGML 10.0 기준)
  const keywords = [
    "define",
    "entity",
    "flow",
    "state",
    "intent",
    "connect",
    "emit",
    "await",
    "timeline",
    "branch",
    "scenario",
    "quantum",
    "parallel",
    "future",
  ];

  for (const kw of keywords) {
    if (new RegExp(`\\b${kw}\\b`).test(t)) return true;
  }

  // namespace.method(...)
  if (/\b[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_]+\(/.test(t)) return true;

  return false;
}

//
// 3. 위험 Bash 명령 검출 강화
// ----------------------------------------------------------
export function isUnsafeBash(text: string): boolean {
  if (!text) return false;
  const t = text.trim();

  // rm -rf / sudo rm / destructive patterns
  if (/rm\s+-rf\b/.test(t)) return true;
  if (/sudo\s+rm\b/.test(t)) return true;

  // catastrophic patterns
  if (/^rm\s+-rf\s+\/($|\s)/.test(t)) return true;
  if (/^rm\s+-rf\s+\*\s*$/.test(t)) return true;

  return false;
}

//
// 4. normalize spaces
// ----------------------------------------------------------
export function normalizeInput(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

//
// 5. classify command (NEW)
// ----------------------------------------------------------
export function classifyCommand(text: string): "bash" | "qgml" | "unknown" {
  if (isQGML(text)) return "qgml";
  if (isBashCommand(text)) return "bash";
  return "unknown";
}
