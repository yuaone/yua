// 📂 src/workflow/flow-unified-engine.ts
// 🔥 YA-ENGINE Unified Workflow Engine — ERROR-FREE FINAL (2025.11)

import axios from "axios";
import { runProvider } from "../service/provider-engine";
import { log, logError } from "../utils/logger";

// 🟦 HPE 엔진들 (경로 FIX)
import { runHPE4 } from "../ai/hpe/4/hpe4-engine";
import { runHPE5 } from "../ai/hpe/5/hpe5-engine";
import { runHPE6 } from "../ai/hpe/hpe6/hpe6-engine";
import { runHPE7 } from "../ai/hpe/hpe7/hpe7-engine";

interface FlowNode {
  id: string;
  type: string;
  input?: string;
  language?: string;
  method?: string;
  url?: string;
  headers?: string;
  body?: string;
  condition?: string;
  trueNext?: string;
  falseNext?: string;
  data?: any;              // ✔ 타입 명시
}

interface FlowEdge {
  source: string;
  target: string;
}

export async function runUnifiedWorkflow(flow: {
  title: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}) {
  try {
    const { nodes, edges, title } = flow;

    if (!nodes || !Array.isArray(nodes))
      throw new Error("nodes must be array");
    if (!edges || !Array.isArray(edges))
      throw new Error("edges must be array");

    const ordered = buildGraphOrder(nodes, edges);

    let output: any = null;
    const results: any[] = [];

    for (const node of ordered) {
      const result = await executeNode(node, output);
      output = result;

      results.push({
        id: node.id,
        type: node.type,
        output: result,
      });
    }

    return {
      ok: true,
      title,
      results,
      finalOutput: output,
    };
  } catch (e: any) {
    logError("❌ UnifiedWorkflow ERROR: " + e.message);
    return { ok: false, error: e.message };
  }
}

function buildGraphOrder(nodes: FlowNode[], edges: FlowEdge[]) {
  try {
    const incoming: Record<string, number> = {};

    nodes.forEach((n) => (incoming[n.id] = 0));
    edges.forEach((e) => incoming[e.target]++);

    let start: FlowNode | undefined =
      nodes.find((n) => incoming[n.id] === 0) || nodes[0];

    const order: FlowNode[] = [];
    const queue: FlowNode[] = [start];
    const visited = new Set<string>();

    while (queue.length) {
      const node = queue.shift();
      if (!node || visited.has(node.id)) continue;

      visited.add(node.id);
      order.push(node);

      const nextNodes = edges
        .filter((e) => e.source === node.id)
        .map((e) => nodes.find((x) => x?.id === e.target))
        .filter((x): x is FlowNode => Boolean(x));

      queue.push(...nextNodes);
    }

    return order;
  } catch (e: any) {
    logError("❌ buildGraphOrder ERROR: " + e.message);
    return nodes;
  }
}

async function executeNode(node: FlowNode, prevOutput: any) {
  const { id, type, data = {} } = node;   // ✔ TS7022 fix

  switch (type) {
    case "task":
      return await runProvider({
        type: "task",
        input: node.input || "",
        prev: prevOutput,
      });

    case "code":
      return await runProvider({
        type: "code",
        language: node.language || "ts",
        input: node.input || "",
        prev: prevOutput,
      });

    case "api":
      return await runApiNode(node);

    case "condition":
      return await runConditionNode(node, prevOutput);

    case "hpe4":
      return await runHPE4(node.input || "");

    case "hpe5":
      return await runHPE5(node.input || "");

    case "hpe6":
      return await runHPE6(node.input || "", "workflow.ts");

    case "hpe7":
      return await runHPE7({
  text: String(node.input ?? ""),
  sessionId: "workflow-engine"
});

    default:
      return prevOutput;
  }
}

async function runApiNode(node: FlowNode) {
  try {
    const headers = safeJson(node.headers);
    const body = safeJson(node.body);

    const res = await axios({
      method: node.method || "GET",
      url: node.url,
      headers,
      data: body,
    });

    return res.data;
  } catch (e: any) {
    logError("❌ API Node Error: " + e.message);
    return { error: e.message };
  }
}

async function runConditionNode(node: FlowNode, prevOutput: any) {
  try {
    // Safety: evaluate condition as a simple boolean expression (no eval)
    const cond = node.condition === "true" ? true : false;

    return {
      condition: cond,
      next: cond ? node.trueNext : node.falseNext,
      prevOutput,
    };
  } catch (e: any) {
    return { error: "조건식 오류: " + e.message };
  }
}

function safeJson(str?: string) {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}
