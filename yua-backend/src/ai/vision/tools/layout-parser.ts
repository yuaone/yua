export type LayoutBlock = {
  kind: "SIDEBAR" | "HEADER" | "MAIN" | "UNKNOWN";
  lines: string[];
};

export type LayoutParseResult = {
  blocks: LayoutBlock[];
  summary: string;
};

function normalizeLines(text: string): string[] {
  return (text ?? "")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

/**
 * Deterministic heuristic layout parser (no bbox)
 * - “PROJECT / New Chat / Settings” 같은 키워드로 sidebar/header/main 분리
 * - 결과는 summary string으로만 반환(나중에 bbox OCR 들어오면 업그레이드)
 */
export function parseLayoutFromOcr(ocrText: string): LayoutParseResult | null {
  const lines = normalizeLines(ocrText);
  if (lines.length === 0) return null;

  const sidebarKeys = ["project", "projects", "new chat", "settings", "general", "워크스페이스", "프로젝트", "새 채팅", "설정"];
  const headerKeys = ["search", "filter", "sort", "로그인", "logout", "profile", "프로필"];
  const chatKeys = ["assistant", "user", "you:", "me:", "system", "채팅", "메시지"];

  const sidebar: string[] = [];
  const header: string[] = [];
  const main: string[] = [];
  const unknown: string[] = [];

  for (const l of lines) {
    const ll = l.toLowerCase();
    if (sidebarKeys.some(k => ll.includes(k))) sidebar.push(l);
    else if (headerKeys.some(k => ll.includes(k))) header.push(l);
    else if (chatKeys.some(k => ll.includes(k))) main.push(l);
    else unknown.push(l);
  }

  const blocks: LayoutBlock[] = [];
  if (header.length) blocks.push({ kind: "HEADER", lines: header.slice(0, 12) });
  if (sidebar.length) blocks.push({ kind: "SIDEBAR", lines: sidebar.slice(0, 18) });
  if (main.length) blocks.push({ kind: "MAIN", lines: main.slice(0, 24) });
  if (!blocks.length) blocks.push({ kind: "UNKNOWN", lines: unknown.slice(0, 24) });

  const summaryParts: string[] = [];
  if (header.length) summaryParts.push(`HEADER 후보 ${header.length}줄`);
  if (sidebar.length) summaryParts.push(`SIDEBAR 후보 ${sidebar.length}줄`);
  if (main.length) summaryParts.push(`MAIN 후보 ${main.length}줄`);
  if (unknown.length) summaryParts.push(`UNKNOWN ${unknown.length}줄`);

  return {
    blocks,
    summary: summaryParts.join(" / "),
  };
}
