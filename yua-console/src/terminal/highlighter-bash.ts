/**
 * YUA ONE — Bash Highlighter (SSOT 3.0 Final)
 * 안정형 / ANSI 충돌 방지 / 성능 최적화 버전
 */

const KEYWORDS = [
  "cd",
  "ls",
  "cat",
  "pwd",
  "echo",
  "mkdir",
  "rm",
  "touch",
  "whoami",
  "sudo",
  "mv",
  "cp",
];

// 위험 명령어 색상 (sudo, rm)
const DANGER = ["sudo", "rm"];

// 옵션 패턴
const OPTION = /(^|\s)-{1,2}[a-zA-Z0-9\-]+/g;

// 파일명 패턴
const FILE = /\b[\w,\-]+\.(txt|md|json|ts|js|sh|log|yaml|yml)\b/g;

// 안전 ANSI Wrapper
const color = (code: string, text: string) =>
  `\x1b[${code}m${text}\x1b[0m`;

export function highlightBash(text: string): string {
  if (!text) return "";

  let result = text;

  // keyword highlight
  for (const kw of KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, "g");

    const colorCode = DANGER.includes(kw)
      ? "38;2;255;80;80" // 강한 빨강
      : "38;2;120;200;255"; // 밝은 파랑

    result = result.replace(regex, (m) => color(colorCode, m));
  }

  // 옵션 하이라이트
  result = result.replace(
    OPTION,
    (m) => color("38;2;180;180;255", m)
  );

  // 파일명 하이라이트
  result = result.replace(
    FILE,
    (m) => color("38;2;255;220;150", m)
  );

  return result;
}
