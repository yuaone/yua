// 📂 src/ai/code-ingest/code-index-engine.ts
// 🔥 CodeIndexEngine — STRUCTURE SAFE INDEXER (SSOT)
// - 절대 코드 변형 ❌
// - 의미 요약 ❌
// - AST 파싱 ❌ (정규식 + brace/indent best-effort)
// - 구조 인덱싱 + 블록 범위 추정

export type CodeSymbolType =
  | "function"
  | "class"
  | "interface"
  | "type"
  | "const"
  | "enum"
  | "namespace"
  | "import"
  | "export"
  | "unknown";

export interface CodeSymbol {
  type: CodeSymbolType;
  name: string;
  startLine: number;
  endLine: number; // best-effort
  exported?: boolean;
  signature?: string; // best-effort
}

export interface CodeIndex {
  totalLines: number;
  symbols: CodeSymbol[];
  headerEndLine: number; // import/export/top-of-file zone end
}

function isHeaderLike(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (/^(\/\/|\/\*|\*|\*\/)/.test(t)) return true;
  if (/^import\s+/.test(t)) return true;
  if (/^export\s+\{/.test(t)) return true;
  if (/^export\s+\*\s+from\s+/.test(t)) return true;
  if (/^export\s+\{.*\}\s+from\s+/.test(t)) return true;
  if (/^export\s+type\s+/.test(t)) return true;
  return false;
}

function detectSymbolType(line: string): CodeSymbolType | null {
  const t = line.trim();

  if (/^import\s+/.test(t)) return "import";
  if (/^export\s+/.test(t) && !/^export\s+(class|function|const|type|interface|enum|namespace)\b/.test(t)) return "export";

  if (/^(export\s+)?(default\s+)?class\s+/.test(t)) return "class";
  if (/^(export\s+)?interface\s+/.test(t)) return "interface";
  if (/^(export\s+)?type\s+/.test(t)) return "type";
  if (/^(export\s+)?enum\s+/.test(t)) return "enum";
  if (/^(export\s+)?namespace\s+/.test(t)) return "namespace";

  // function forms
  if (/^(export\s+)?(default\s+)?async\s+function\s+/.test(t)) return "function";
  if (/^(export\s+)?(default\s+)?function\s+/.test(t)) return "function";

  // const function / arrow forms
  if (/^(export\s+)?const\s+[A-Za-z0-9_]+\s*=\s*(async\s*)?\(/.test(t)) return "const";
  if (/^(export\s+)?const\s+[A-Za-z0-9_]+\s*=\s*(async\s*)?[A-Za-z0-9_]+\s*=>/.test(t)) return "const";
  if (/^(export\s+)?const\s+[A-Za-z0-9_]+\s*=\s*(async\s*)?\(?.*\)?\s*=>/.test(t)) return "const";

  // CJS exports
  if (/^module\.exports\s*=/.test(t)) return "export";
  if (/^exports\.[A-Za-z0-9_]+\s*=/.test(t)) return "export";

  return null;
}

function extractSymbolName(type: CodeSymbolType, line: string): string {
  const t = line.trim();

  if (type === "import") return "import";
  if (type === "export") return "export";

  // class Foo
  let m = t.match(/class\s+([A-Za-z0-9_]+)/);
  if (m?.[1]) return m[1];

  // interface Foo
  m = t.match(/interface\s+([A-Za-z0-9_]+)/);
  if (m?.[1]) return m[1];

  // type Foo =
  m = t.match(/type\s+([A-Za-z0-9_]+)/);
  if (m?.[1]) return m[1];

  // enum Foo
  m = t.match(/enum\s+([A-Za-z0-9_]+)/);
  if (m?.[1]) return m[1];

  // namespace Foo
  m = t.match(/namespace\s+([A-Za-z0-9_]+)/);
  if (m?.[1]) return m[1];

  // function foo
  m = t.match(/function\s+([A-Za-z0-9_]+)/);
  if (m?.[1]) return m[1];

  // const foo =
  m = t.match(/const\s+([A-Za-z0-9_]+)/);
  if (m?.[1]) return m[1];

  return "anonymous";
}

function isExported(line: string): boolean {
  return /^\s*export\s+/.test(line.trim()) || /^\s*module\.exports\s*=/.test(line.trim()) || /^\s*exports\./.test(line.trim());
}

function extractSignature(type: CodeSymbolType, line: string): string | undefined {
  const t = line.trim();
  if (!t) return undefined;

  if (type === "function") {
    const m = t.match(/(async\s+)?function\s+[A-Za-z0-9_]+\s*\((.*)\)/);
    if (m) return `function(${(m[2] ?? "").slice(0, 160)})`;
  }

  if (type === "class") {
    const m = t.match(/class\s+[A-Za-z0-9_]+\s*(extends\s+[A-Za-z0-9_$.]+)?/);
    if (m) return `class${m[1] ? ` ${m[1]}` : ""}`;
  }

  if (type === "const") {
    const m = t.match(/const\s+[A-Za-z0-9_]+\s*=\s*(.*)/);
    if (m) return `const = ${(m[1] ?? "").slice(0, 160)}`;
  }

  return undefined;
}

// best-effort block end finder:
// - if line contains "{", track brace balance until it returns to 0
// - if no "{", endLine = startLine (single-liner)
function findBlockEnd(lines: string[], startIdx: number): number {
  const startLine = lines[startIdx] ?? "";
  const hasOpen = startLine.includes("{");
  if (!hasOpen) return startIdx + 1;

  let balance = 0;
  let started = false;

  for (let i = startIdx; i < lines.length; i++) {
    const l = lines[i];

    // naive: ignore braces in strings? (best-effort only)
    for (const ch of l) {
      if (ch === "{") {
        balance++;
        started = true;
      } else if (ch === "}") {
        balance--;
      }
    }

    if (started && balance <= 0) {
      return i + 1; // 1-based
    }
  }

  return lines.length;
}

export const CodeIndexEngine = {
  build(code: string): CodeIndex {
    const lines = code.split("\n");
    const symbols: CodeSymbol[] = [];

    // header zone: first continuous header-like region (imports/comments/blank/exports)
    let headerEndLine = 1;
    for (let i = 0; i < Math.min(lines.length, 300); i++) {
      if (!isHeaderLike(lines[i])) {
        headerEndLine = i; // 1-based end is i (exclusive)
        break;
      }
      headerEndLine = i + 1;
    }

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const type = detectSymbolType(line);
      if (!type) continue;

      // skip pure import/export statements as symbols unless you want them
      if (type === "import" || type === "export") continue;

      const name = extractSymbolName(type, line);
      const endLine = findBlockEnd(lines, idx);

      symbols.push({
        type,
        name,
        startLine: idx + 1,
        endLine,
        exported: isExported(line),
        signature: extractSignature(type, line),
      });
    }

    return {
      totalLines: lines.length,
      symbols,
      headerEndLine,
    };
  },
};
