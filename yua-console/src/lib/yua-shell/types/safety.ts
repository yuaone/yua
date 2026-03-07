// ===================================================================
// YUA Shell — Safety Layer (SSOT 3.0)
// AST 실행 전 위험성 검사
// ===================================================================

import type { QGMLNode, EngineCallNode } from "./qgml-node";

export interface SafetyResult {
  safe: boolean;
  reason?: string;
}

/* ===============================================================
   BLOCKED RULES
=============================================================== */
const BLOCKED_NAMESPACE = ["root", "admin"];
const BLOCKED_METHODS = ["rm", "delete", "shutdown"];

/* ===============================================================
   MAIN ENTRY
=============================================================== */
export function safetyCheck(node: QGMLNode): SafetyResult {
  // Empty → unsafe 처리할 필요 없음
  if (node.type === "empty") return { safe: true };

  // Engine Call 검사
  if (node.type === "engine_call") {
    return checkEngineCall(node);
  }

  // quantum / parallel 은 현재 safe
  return { safe: true };
}

/* ===============================================================
   ENGINE CALL SAFETY
=============================================================== */
function checkEngineCall(node: EngineCallNode): SafetyResult {
  // 위험 namespace
  if (BLOCKED_NAMESPACE.includes(node.namespace)) {
    return {
      safe: false,
      reason: `Blocked namespace: '${node.namespace}'`,
    };
  }

  // 위험 method
  if (BLOCKED_METHODS.includes(node.method)) {
    return {
      safe: false,
      reason: `Blocked method: '${node.method}'`,
    };
  }

  // args 검사
  for (const arg of node.args) {
    if (String(arg).includes("rm -rf")) {
      return {
        safe: false,
        reason: "Dangerous argument detected",
      };
    }
  }

  return { safe: true };
}
