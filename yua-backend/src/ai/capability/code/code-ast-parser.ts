// 📂 src/ai/capability/code/code-ast-parser.ts

import * as acorn from "acorn";

export function parseJS(code: string) {
  return acorn.parse(code, {
    ecmaVersion: "latest",
    sourceType: "module",
    allowReturnOutsideFunction: true,
  });
}
