// ===================================================================
// YUA Shell — QGML Executor (SSOT 10.0 Final Type-Safe Version)
// ===================================================================

import type {
  QGMLNode,
  EngineCallNode,
  QuantumBlockNode,
  ParallelBlockNode,
  TimelineBlockNode,
  FutureBlockNode,
  ScenarioNode,
  BranchNode,
  AwaitNode,
} from "../types/qgml-node";

import type { EngineResult } from "../types/engine-result";
import type { QGMLContext } from "../types/context";

import { safetyCheck } from "../types/safety";
import { routeEngineCall } from "./engine-router";

// ===================================================================
// Main dispatcher
// ===================================================================
export async function executeQGML(
  node: QGMLNode,
  ctx: QGMLContext
): Promise<EngineResult> {
  const started = Date.now();

  if (node.type === "empty")
    return fail("Empty input", node.raw ?? "", ctx, started);

  const safe = safetyCheck(node);
  if (!safe.safe)
    return fail(safe.reason ?? "", node.raw ?? "", ctx, started);

  switch (node.type) {
    case "engine_call":
      return executeEngineCall(node, ctx, started);

    case "quantum_block":
      return executeQuantum(node, ctx, started);

    case "parallel_block":
      return executeParallel(node, ctx, started);

    case "timeline_block":
      return executeTimeline(node, ctx, started);

    case "future_block":
      return executeFuture(node, ctx, started);

    case "scenario":
      return executeScenario(node, ctx, started);

    case "branch":
      return executeBranch(node, ctx, started);

    case "await":
      return executeAwait(node, ctx, started);

    case "expr":
      return {
        ok: true,
        raw: node.raw ?? "",
        engine: "expr",
        output: node.value,
        executionId: ctx.executionId,
        duration: Date.now() - started,
        meta: {},
      };
  }

  return fail(
    `Unknown QGML instruction '${(node as any).type}'`,
    node.raw ?? "",
    ctx,
    started
  );
}


// ===================================================================
// ENGINE CALL
// ===================================================================
async function executeEngineCall(
  node: EngineCallNode,
  ctx: QGMLContext,
  started: number
): Promise<EngineResult> {
  try {
    const out = await routeEngineCall(node, ctx);
    ctx.log("info", `Executed ${node.namespace}.${node.method}`);
    return out;
  } catch (err: any) {
    return fail(`Engine error: ${err.message}`, node.raw ?? "", ctx, started);
  }
}

// ===================================================================
// QUANTUM
// ===================================================================
async function executeQuantum(
  node: QuantumBlockNode,
  ctx: QGMLContext,
  started: number
): Promise<EngineResult> {
  const results: EngineResult[] = [];

  for (const line of node.body) {
    const parsed = ctx.parser(line);
    results.push(await executeQGML(parsed, ctx));
  }

  return {
    ok: true,
    engine: "quantum",
    raw: node.raw ?? "",
    output: "Quantum block executed",
    executionId: ctx.executionId,
    duration: Date.now() - started,
    meta: { results },
  };
}

// ===================================================================
// PARALLEL
// ===================================================================
async function executeParallel(
  node: ParallelBlockNode,
  ctx: QGMLContext,
  started: number
) {
  const tasks = node.body.map((ln) =>
    executeQGML(ctx.parser(ln), ctx)
  );

  const results = await Promise.all(tasks);

  return {
    ok: true,
    engine: "parallel",
    raw: node.raw ?? "",
    output: "Parallel block executed",
    executionId: ctx.executionId,
    duration: Date.now() - started,
    meta: { results },
  };
}

// ===================================================================
// TIMELINE
// ===================================================================
async function executeTimeline(
  node: TimelineBlockNode,
  ctx: QGMLContext,
  started: number
): Promise<EngineResult> {
  const results: EngineResult[] = [];

  for (const ln of node.body) {
    results.push(await executeQGML(ctx.parser(ln), ctx));
  }

  return {
    ok: true,
    raw: node.raw ?? "",
    engine: "timeline",
    output: "Timeline executed",
    executionId: ctx.executionId,
    duration: Date.now() - started,
    meta: { results },
  };
}

// ===================================================================
// FUTURE
// ===================================================================
async function executeFuture(
  node: FutureBlockNode,
  ctx: QGMLContext,
  started: number
): Promise<EngineResult> {
  return {
    ok: true,
    raw: node.raw ?? "",
    engine: "future",
    output: "Future scheduled",
    executionId: ctx.executionId,
    duration: Date.now() - started,
    meta: {},
  };
}

// ===================================================================
// SCENARIO
// ===================================================================
async function executeScenario(
  node: ScenarioNode,
  ctx: QGMLContext,
  started: number
): Promise<EngineResult> {
  const results: EngineResult[] = [];

  for (const ln of node.body) {
    results.push(await executeQGML(ctx.parser(ln), ctx));
  }

  return {
    ok: true,
    raw: node.raw ?? "",
    engine: "scenario",
    output: `Scenario ${node.name} executed`,
    executionId: ctx.executionId,
    duration: Date.now() - started,
    meta: { results },
  };
}

// ===================================================================
// BRANCH
// ===================================================================
async function executeBranch(
  node: BranchNode,
  ctx: QGMLContext,
  started: number
) {
  const first = node.cases[0];
  const results: EngineResult[] = [];

  for (const ln of first.body) {
    results.push(await executeQGML(ctx.parser(ln), ctx));
  }

  return {
    ok: true,
    raw: node.raw ?? "",
    engine: "branch",
    output: `Branch → case ${first.name}`,
    executionId: ctx.executionId,
    duration: Date.now() - started,
    meta: { results },
  };
}

// ===================================================================
// AWAIT
// ===================================================================
async function executeAwait(
  node: AwaitNode,
  ctx: QGMLContext,
  started: number
) {
  // ❗ FIX: node.expr.raw → node.expr.raw ?? ""
  const parsed = ctx.parser(node.expr.raw ?? "");

  const out = await executeQGML(parsed, ctx);

  return {
    ok: true,
    raw: node.raw ?? "",
    engine: "await",
    output: out.output ?? "",
    executionId: ctx.executionId,
    duration: Date.now() - started,
    meta: out,
  };
}

// ===================================================================
// FAIL — FIXED
// ===================================================================
function fail(
  message: string,
  raw: string,         // ← string | undefined 제거!
  ctx: QGMLContext,
  started: number
): EngineResult {
  const safeRaw = raw ?? "";

  ctx.log("error", message);

  return {
    ok: false,
    raw: safeRaw,
    engine: "system",
    error: message,
    executionId: ctx.executionId,
    duration: Date.now() - started,
    meta: {},
  };
}
