// 📂 src/ai/capability/code/code-ast-engine.ts

import { CodeASTResult, CodeASTFeatures } from "./code-ast-types";
import { parseJS } from "./code-ast-parser";

export function analyzeCodeAST(
  code: string
): CodeASTResult {
  let ast: any;

  try {
    ast = parseJS(code);
  } catch {
    return {
      features: emptyFeatures(),
      confidence: 0.3,
    };
  }

  let nodeCount = 0;
  let maxDepth = 0;
  let branchCount = 0;
  let loopCount = 0;
  let functionCount = 0;

  let mutationOps = 0;
  let ioOps = 0;

  let hasEval = false;
  let hasFileIO = false;
  let hasNetwork = false;
  let hasPrivilegeKeyword = false;

  function walk(node: any, depth: number) {
    if (!node || typeof node !== "object") return;

    nodeCount++;
    maxDepth = Math.max(maxDepth, depth);

    switch (node.type) {
      case "IfStatement":
      case "ConditionalExpression":
        branchCount++;
        break;

      case "ForStatement":
      case "WhileStatement":
      case "DoWhileStatement":
        loopCount++;
        break;

      case "FunctionDeclaration":
      case "ArrowFunctionExpression":
        functionCount++;
        break;

      case "AssignmentExpression":
      case "UpdateExpression":
        mutationOps++;
        break;

      case "CallExpression":
        if (node.callee?.name === "eval") hasEval = true;
        if (["fetch", "axios"].includes(node.callee?.name))
          hasNetwork = true;
        if (["require", "import"].includes(node.callee?.name))
          hasFileIO = true;
        break;

      case "Identifier":
        if (
          ["sudo", "chmod", "chown", "process"].includes(
            node.name
          )
        ) {
          hasPrivilegeKeyword = true;
        }
        break;
    }

    for (const key in node) {
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((v) => walk(v, depth + 1));
      } else {
        walk(value, depth + 1);
      }
    }
  }

  walk(ast, 1);

  const mutationScore =
    nodeCount === 0 ? 0 : (mutationOps + ioOps) / nodeCount;

  const features: CodeASTFeatures = {
    nodeCount,
    maxDepth,
    branchCount,
    loopCount,
    functionCount,
    hasEval,
    hasFileIO,
    hasNetwork,
    hasPrivilegeKeyword,
    mutationScore,
  };

  return {
    features,
    confidence: 1.0,
  };
}

function emptyFeatures(): CodeASTFeatures {
  return {
    nodeCount: 0,
    maxDepth: 0,
    branchCount: 0,
    loopCount: 0,
    functionCount: 0,
    hasEval: false,
    hasFileIO: false,
    hasNetwork: false,
    hasPrivilegeKeyword: false,
    mutationScore: 0,
  };
}
