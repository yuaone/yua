// 📂 src/ai/capability/math/math-graph-parser.ts

export interface MathToken {
  value: string;
  type: "operator" | "symbol" | "number" | "paren" | "word";
}

const OPERATOR_REGEX = /[+\-*/^=]/;
const WORD_REGEX = /[a-zA-Z가-힣]+/;

export function tokenizeMath(
  expr: string
): MathToken[] {
  const tokens: MathToken[] = [];
  let buffer = "";

  function flush(type: MathToken["type"]) {
    if (!buffer) return;
    tokens.push({ value: buffer, type });
    buffer = "";
  }

  for (const ch of expr) {
    if (OPERATOR_REGEX.test(ch)) {
      flush("symbol");
      tokens.push({ value: ch, type: "operator" });
    } else if (ch === "(" || ch === ")") {
      flush("symbol");
      tokens.push({ value: ch, type: "paren" });
    } else if (/\d/.test(ch)) {
      buffer += ch;
    } else if (/\s/.test(ch)) {
      flush("symbol");
    } else {
      buffer += ch;
    }
  }

  flush("symbol");
  return tokens;
}
