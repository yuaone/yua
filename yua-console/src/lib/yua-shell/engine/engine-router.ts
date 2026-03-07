// ===================================================================
// Engine Router — SSOT 10.1 FINAL (Cloud Run Safe Version)
// ===================================================================

import type { EngineCallNode } from "../types/qgml-node";
import type { EngineResult } from "../types/engine-result";
import type { QGMLContext } from "../types/context";

import { MathEngine } from "./modules/math-engine";
import { SystemEngine } from "./modules/system-engine";

import { QuantumEngine } from "./modules/quantum-engine";
import { ParallelEngine } from "./modules/parallel-engine";
import { LogicEngine } from "./modules/logic-engine";
import { TensorEngine } from "./modules/tensor-engine";
import { MemoryEngine } from "./modules/memory-engine";
import { DBEngine } from "./modules/db-engine";
import { LLMEngine } from "./modules/llm-engine";

// ===================================================================
// ⭐ Native C Engine (Optional Load)
// ===================================================================
let CEngineRuntime: any = null;

try {
  // Cloud Run에서는 bindings 모듈이 없어서 실패 → fallback 처리
  CEngineRuntime = require("../../yua-c/runtime/c-runtime").CEngineRuntime;
  console.log("⚡ Native CEngineRuntime loaded.");
} catch (err) {
  console.warn("⚠️ Native CEngineRuntime disabled (Cloud Run safe mode).");
}

// ===================================================================
// Engine Map
// ===================================================================
const engines: Record<string, any> = {
  math: MathEngine,
  system: SystemEngine,
  quantum: QuantumEngine,
  parallel: ParallelEngine,
  logic: LogicEngine,
  tensor: TensorEngine,
  memory: MemoryEngine,
  db: DBEngine,
  llm: LLMEngine,
};

// Only add C engine if it loaded successfully
if (CEngineRuntime) {
  engines["c"] = CEngineRuntime;
}

// ===================================================================
// Router
// ===================================================================
export async function routeEngineCall(
  node: EngineCallNode,
  ctx: QGMLContext
): Promise<EngineResult> {
  const engine = engines[node.namespace];

  if (!engine) {
    return {
      ok: false,
      raw: node.raw,
      engine: node.namespace,
      error: `Unknown engine namespace '${node.namespace}'`,
    };
  }

  if (typeof engine.run !== "function") {
    return {
      ok: false,
      raw: node.raw,
      engine: node.namespace,
      error: `Engine '${node.namespace}' missing run()`,
    };
  }

  try {
    return await engine.run(node.method, node.args, node.raw, ctx);
  } catch (err: any) {
    return {
      ok: false,
      raw: node.raw,
      engine: node.namespace,
      error: err?.message ?? String(err),
    };
  }
}
