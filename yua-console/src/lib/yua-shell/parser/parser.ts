// ===================================================================
// QGML Parser — SSOT 10.0 UPGRADED FINAL
// tokenizer → AST
// Supports full grammar:
// engine.*, await, quantum/parallel/timeline/future,
// scenario, branch/case, expr
// ===================================================================

import { tokenizeQGML } from "../tokenizer/tokenizer";
import type {
  QGMLNode,
  EngineCallNode,
  QuantumBlockNode,
  ParallelBlockNode,
  TimelineBlockNode,
  FutureBlockNode,
  BranchNode,
  ScenarioNode,
  AwaitNode,
  ExpressionNode,
} from "../types/qgml-node";

// ===================================================================
// MAIN ENTRY
// ===================================================================
export function parseQGML(input: string): QGMLNode {
  const raw = input;
  const trimmed = input.trim();

  if (!trimmed) return { type: "empty", raw };

  const tokens = tokenizeQGML(trimmed);
  if (!tokens.length) return { type: "unknown", raw };

  return (
    parseAwait(tokens, raw) ||
    parseEngineCall(tokens, raw) ||
    parseQuantumBlock(trimmed, raw) ||
    parseParallelBlock(trimmed, raw) ||
    parseTimelineBlock(trimmed, raw) ||
    parseFutureBlock(trimmed, raw) ||
    parseScenarioBlock(trimmed, raw) ||
    parseBranchBlock(trimmed, raw) ||
    parseExpression(trimmed, raw)
  );
}

// ===================================================================
// ENGINE CALL  engine.math.add(1, 2)
// ===================================================================
function parseEngineCall(tokens: any[], raw: string): EngineCallNode | null {
  if (tokens[0]?.value !== "engine") return null;
  if (tokens[1]?.type !== "dot") return null;
  if (tokens[2]?.type !== "identifier") return null;
  if (tokens[3]?.type !== "dot") return null;
  if (tokens[4]?.type !== "identifier") return null;

  const namespace = tokens[2].value;
  const method = tokens[4].value;

  const args: string[] = [];
  let buf = "";
  let started = false;
  let depth = 0;

  for (let i = 5; i < tokens.length; i++) {
    const t = tokens[i];

    if (t.type === "paren_open") {
      depth++;
      started = true;
      continue;
    }

    if (t.type === "paren_close") {
      depth--;
      if (depth === 0) {
        if (buf.trim()) args.push(buf.trim());
        break;
      }
      continue;
    }

    if (!started) continue;

    if (t.type === "comma") {
      if (buf.trim()) args.push(buf.trim());
      buf = "";
      continue;
    }

    buf += t.value;
  }

  return { type: "engine_call", namespace, method, args, raw };
}

// ===================================================================
// AWAIT — await engine.llm.chat("hi")
// ===================================================================
function parseAwait(tokens: any[], raw: string): AwaitNode | null {
  if (tokens[0]?.type !== "keyword" || tokens[0]?.value !== "await") return null;

  const inner = raw.replace(/^await\s+/, "");

  return {
    type: "await",
    raw,
    expr: parseQGML(inner),
  };
}

// ===================================================================
// BLOCK EXTRACTOR
// ===================================================================
function extractBlock(text: string): string[] {
  const open = text.indexOf("{");
  const close = text.lastIndexOf("}");
  if (open === -1 || close === -1) return [];

  const inner = text.substring(open + 1, close).trim();

  return inner
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

// ===================================================================
// BLOCK PARSERS
// ===================================================================
function parseQuantumBlock(text: string, raw: string): QuantumBlockNode | null {
  if (!text.startsWith("quantum")) return null;
  return { type: "quantum_block", raw, body: extractBlock(text) };
}

function parseParallelBlock(text: string, raw: string): ParallelBlockNode | null {
  if (!text.startsWith("parallel")) return null;
  return { type: "parallel_block", raw, body: extractBlock(text) };
}

function parseTimelineBlock(text: string, raw: string): TimelineBlockNode | null {
  if (!text.startsWith("timeline")) return null;
  return { type: "timeline_block", raw, body: extractBlock(text) };
}

function parseFutureBlock(text: string, raw: string): FutureBlockNode | null {
  if (!text.startsWith("future")) return null;
  return { type: "future_block", raw, body: extractBlock(text) };
}

// ===================================================================
// SCENARIO — scenario login { ... }
// ===================================================================
function parseScenarioBlock(text: string, raw: string): ScenarioNode | null {
  if (!text.startsWith("scenario ")) return null;

  const head = text.split("{")[0].trim();
  const [, name] = head.split(" ");

  return {
    type: "scenario",
    name,
    raw,
    body: extractBlock(text),
  };
}

// ===================================================================
// BRANCH — branch { case success {...} case error {...} }
// ===================================================================
function parseBranchBlock(text: string, raw: string): BranchNode | null {
  if (!text.startsWith("branch")) return null;

  const lines = extractBlock(text);

  const cases: BranchNode["cases"] = [];
  let currentName = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    if (line.startsWith("case ")) {
      if (currentName) {
        cases.push({ name: currentName, body: currentBody });
      }
      currentName = line.split(" ")[1];
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  if (currentName) {
    cases.push({ name: currentName, body: currentBody });
  }

  return { type: "branch", raw, cases };
}

// ===================================================================
// BASIC EXPR
// ===================================================================
function parseExpression(text: string, raw: string): ExpressionNode {
  return { type: "expr", raw, value: text };
}
