// src/console/yua-shell/tokenizer.ts

import { TOKEN_TYPES, QGMLToken } from "./grammar";

export function tokenize(input: string): QGMLToken[] {
  const tokens: QGMLToken[] = [];
  let i = 0;

  const push = (type: string, value: string) =>
    tokens.push({ type, value });

  while (i < input.length) {
    const c = input[i];

    if (/\s/.test(c)) {
      i++;
      continue;
    }

    // 문자열
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      let str = "";
      while (i < input.length && input[i] !== quote) {
        str += input[i++];
      }
      i++;
      push(TOKEN_TYPES.STRING, str);
      continue;
    }

    // 숫자
    if (/[0-9]/.test(c)) {
      let num = "";
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i++];
      }
      push(TOKEN_TYPES.NUMBER, num);
      continue;
    }

    // 식별자
    if (/[a-zA-Z_\-]/.test(c)) {
      let ident = "";
      while (i < input.length && /[a-zA-Z0-9_\-]/.test(input[i])) {
        ident += input[i++];
      }
      push(TOKEN_TYPES.IDENT, ident);
      continue;
    }

    // 단일 문자
    if (c === "=") push(TOKEN_TYPES.EQUAL, "=");
    else if (c === "[") push(TOKEN_TYPES.LBRACKET, "[");
    else if (c === "]") push(TOKEN_TYPES.RBRACKET, "]");
    else if (c === ",") push(TOKEN_TYPES.COMMA, ",");
    else throw new Error("Unknown char in QGML: " + c);

    i++;
  }

  push(TOKEN_TYPES.EOF, "");
  return tokens;
}
