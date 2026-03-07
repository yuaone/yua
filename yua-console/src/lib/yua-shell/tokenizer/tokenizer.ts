// ===================================================================
// QGML Tokenizer — SSOT 10.0 Final Grammar
// Extended syntax for timeline, scenario, branch, future, await
// ===================================================================

export type TokenType =
  | "identifier"
  | "number"
  | "string"
  | "namespace"
  | "dot"
  | "paren_open"
  | "paren_close"
  | "brace_open"
  | "brace_close"
  | "comma"
  | "operator"
  | "range"
  | "keyword"
  | "annotation"
  | "await"
  | "unknown";

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const KEYWORDS = [
  "define",
  "entity",
  "flow",
  "state",
  "emit",
  "connect",
  "parallel",
  "quantum",
  "timeline",
  "branch",
  "scenario",
  "case",
  "future",
  "event",
];

const MULTI_CHAR_OPERATORS = ["==", "!=", "<=", ">="];

export function tokenizeQGML(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const push = (type: TokenType, value: string, pos: number) =>
    tokens.push({ type, value, pos });

  while (i < input.length) {
    const ch = input[i];
    const start = i;

    // whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // =====================================================
    // STRING
    // =====================================================
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++;
      let str = "";
      while (i < input.length && input[i] !== quote) str += input[i++];
      i++; // skip closing quote
      push("string", str, start);
      continue;
    }

    // =====================================================
    // NUMBER
    // =====================================================
    if (/[0-9]/.test(ch)) {
      let v = "";
      while (/[0-9.]/.test(input[i])) v += input[i++];
      push("number", v, start);
      continue;
    }

    // =====================================================
    // ANNOTATION: @gpu, @async, @timeline
    // =====================================================
    if (ch === "@") {
      i++;
      let name = "";
      while (/[a-zA-Z_]/.test(input[i])) name += input[i++];
      push("annotation", name, start);
      continue;
    }

    // =====================================================
    // await (async-like keyword)
    // =====================================================
    if (input.startsWith("await", i)) {
      push("await", "await", start);
      i += 5;
      continue;
    }

    // =====================================================
    // IDENTIFIER or KEYWORD or NAMESPACE
    // =====================================================
    if (/[a-zA-Z_]/.test(ch)) {
      let id = "";
      while (/[a-zA-Z0-9_]/.test(input[i])) id += input[i++];

      if (input[i] === ".") {
        push("namespace", id, start);
        push("dot", ".", i++);
        continue;
      }

      if (KEYWORDS.includes(id)) push("keyword", id, start);
      else push("identifier", id, start);

      continue;
    }

    // =====================================================
    // BRACES
    // =====================================================
    if (ch === "{") {
      push("brace_open", "{", i++);
      continue;
    }
    if (ch === "}") {
      push("brace_close", "}", i++);
      continue;
    }

    // =====================================================
    // PARENTHESES
    // =====================================================
    if (ch === "(") {
      push("paren_open", "(", i++);
      continue;
    }
    if (ch === ")") {
      push("paren_close", ")", i++);
      continue;
    }

    // =====================================================
    // RANGE ".."
    // =====================================================
    if (input.slice(i, i + 2) === "..") {
      push("range", "..", i);
      i += 2;
      continue;
    }

    // =====================================================
    // MULTI-CHAR OPERATORS (==, !=, <=, >=)
    // =====================================================
    const two = input.slice(i, i + 2);
    if (MULTI_CHAR_OPERATORS.includes(two)) {
      push("operator", two, start);
      i += 2;
      continue;
    }

    // =====================================================
    // SINGLE-CHAR OPERATORS
    // =====================================================
    if (/[-+*/=<>&]/.test(ch)) {
      push("operator", ch, i++);
      continue;
    }

    // comma
    if (ch === ",") {
      push("comma", ",", i++);
      continue;
    }

    // dot
    if (ch === ".") {
      push("dot", ".", i++);
      continue;
    }

    // Unknown
    push("unknown", ch, i++);
  }

  return tokens;
}
