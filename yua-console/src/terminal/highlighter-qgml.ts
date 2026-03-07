/**
 * YUA ONE — QGML 10.0 Highlighter (SSOT Final)
 * - namespace.method()
 * - key=value
 * - keywords
 * - ANSI 안정 처리
 * - xterm 최적화
 */

// QGML 핵심 키워드 (SSOT 10.0 기반)
const KEYWORDS = [
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
  "quantum",
  "parallel",
  "scenario",
  "future",
];

// namespace.method(
const NAMESPACE = /\b([a-zA-Z_][a-zA-Z0-9_]*)\.(?=[a-zA-Z_]+\()/g;

// key=value
const KV = /\b([a-zA-Z_][a-zA-Z0-9_]*)=([^\s,)]+)/g;

// ANSI wrap
const color = (code: string, text: string) =>
  `\x1b[${code}m${text}\x1b[0m`;

export function highlightQGML(text: string): string {
  if (!text) return "";

  let result = text;

  // namespace highlight
  result = result.replace(NAMESPACE, (m) =>
    color("38;2;120;220;255", m)
  );

  // key=value highlight
  result = result.replace(KV, (_match, key, val) => {
    const k = color("38;2;255;200;120", key);
    const v = color("38;2;180;255;180", val);
    return `${k}=${v}`;
  });

  // keyword highlight
  for (const kw of KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, "g");
    result = result.replace(
      regex,
      (m) => color("38;2;180;255;180", m)
    );
  }

  return result;
}
