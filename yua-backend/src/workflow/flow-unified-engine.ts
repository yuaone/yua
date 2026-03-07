// 📂 src/workflow/flow-unified-engine.ts
// 🚀 YUA Unified Workflow Engine — HPE 3.0~7.0 EXTENDED FINAL

import axios from "axios";

import { runProviderAuto } from "../service/provider-engine";
import KBEngine from "../ai/kb/kb-engine";
import IntentEngine from "../ai/intent/intent-engine";
import { runFileAnalysis } from "../ai/file/file-engine";
import { runImageAnalysis } from "../ai/image/image-engine";
import { runGuardrail } from "../service/guardrail-engine";
import { AdvisorEngine } from "../ai/advisor/advisor-engine";
import { PromptBuilder } from "../ai/utils/prompt-builder";

// HPE 3.0
import { runHPEEngine } from "../ai/hpe/hpe-engine";

// HPE 4.0~7.0
import { runHPE4 } from "../ai/hpe/4/hpe4-engine";
import { runHPE5 } from "../ai/hpe/5/hpe5-engine";
import { runHPE6 } from "../ai/hpe/hpe6/hpe6-engine";
import { runHPE7 } from "../ai/hpe/hpe7/hpe7-engine";

import { log, logError } from "../utils/logger";

/* ----------------------------------------------------------- */
/* ⭐ 타입 정의                                                 */
/* ----------------------------------------------------------- */

export interface FlowInput {
  title: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  type: string;
  data?: NodeData;
}

export interface NodeData {
  input?: string;
  condition?: string;
  trueNext?: string;
  falseNext?: string;

  query?: string;
  fileBase64?: string;
  fileId?: string;
  fileName?: string;
  userId?: string;

  imageUrl?: string;
  mode?: string;
  projectId?: string;

  url?: string;
  method?: string;
  headers?: any;
  body?: any;

  hpeInput?: string;
  hpeContext?: any[];
  hpeMode?: "3" | "4" | "5" | "6" | "7";
}

export interface FlowEdge {
  source: string;
  target: string;
}

/* ----------------------------------------------------------- */
/* ⭐ 유틸                                                     */
/* ----------------------------------------------------------- */

function safeJson(input: any) {
  try {
    if (!input) return {};
    if (typeof input === "string") return JSON.parse(input);
    return input;
  } catch {
    return {};
  }
}

function normalizeAdvisorMode(mode: any) {
  if (!mode) return "general";
  const m = String(mode).toLowerCase();
  return ["general", "dev", "tax", "risk"].includes(m) ? m : "general";
}

function findStartNode(nodes: FlowNode[], edges: FlowEdge[]) {
  const targetSet = new Set(edges.map((e) => e.target));
  return nodes.find((n) => !targetSet.has(n.id));
}

function safeBoolean(expr: string): boolean {
  try {
    return Function(`"use strict"; return (${expr});`)();
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------- */
/* ⭐ 메인 엔진                                                 */
/* ----------------------------------------------------------- */

export async function runFlowUnifiedEngine(flow: FlowInput) {
  try {
    const { title, nodes, edges } = flow;

    const steps: any[] = [];
    let output: any = "";

    let current = findStartNode(nodes, edges);
    if (!current) return { ok: false, error: "시작 노드를 찾을 수 없습니다" };

    while (current) {
      const id = current.id;
      const type = current.type;
      const data: NodeData = current.data ?? {};

      log(`➡ 실행: ${id} (${type})`);

      let result: any = null;

      /* ---------------- TASK / CODE / INTENT ---------------- */

      if (type === "task" || type === "code" || type === "intent") {
        const prompt = await PromptBuilder.buildChatPrompt(
          type,
          data.input ?? "",
          {
            memoryContext:
              typeof output === "string"
                ? output
                : JSON.stringify(output),
          }
        );

        if (type === "intent") result = await IntentEngine.detect(prompt);
        else result = await runProviderAuto(prompt);
      }

      /* ---------------- API ---------------- */

      else if (type === "api") {
        try {
          result = (
            await axios({
              method: data.method || "GET",
              url: data.url,
              headers: safeJson(data.headers),
              data: safeJson(data.body),
            })
          ).data;
        } catch (e: any) {
          result = "API 오류: " + e.message;
        }
      }

      /* ---------------- ADVISOR ---------------- */

      else if (type === "advisor") {
        result = await AdvisorEngine.advise({
          userMessage: data.input ?? "",
          projectId: data.projectId,
          mode: normalizeAdvisorMode(data.mode),
        });
      }

      /* ---------------- CONDITION ---------------- */

      else if (type === "condition") {
        const cond = safeBoolean(data.condition ?? "false");
        steps.push({ nodeId: id, type, output: cond });

        const nextId = cond ? data.trueNext : data.falseNext;
        if (!nextId) break;

        current = nodes.find((n) => n.id === nextId);
        continue;
      }

      /* ---------------- KB / FILE / IMAGE ---------------- */

      else if (type === "kb") result = await KBEngine.search(data.query ?? "");

      else if (type === "file") {
        result = await runFileAnalysis({
          fileBase64: data.fileBase64 ?? data.fileId ?? "",
          fileName: data.fileName ?? "uploaded-file",
          userId: data.userId ?? "system",
        });
      }

      else if (type === "image") {
        result = await runImageAnalysis(data.imageUrl || "");
      }

      /* ---------------- GUARDRAIL ---------------- */

      else if (type === "guardrail") {
        result = await runGuardrail(output);
      }

      /* ---------------- HPE ---------------- */

      else if (type === "hpe") {
        const input = data.hpeInput ?? data.input ?? "";
        const ctx = data.hpeContext ?? [];
        const mode = data.hpeMode || "3";

        if (mode === "3") result = await runHPEEngine({ input, context: ctx });
        else if (mode === "4") result = await runHPE4(input);
        else if (mode === "5") result = await runHPE5(input);
        else if (mode === "6")
          result = await runHPE6(input, "workflow-node");
        else if (mode === "7")
          result = await runHPE7({
            text: String(input ?? ""),
            sessionId: "flow-unified",
          });
        else result = { ok: false, error: "Unknown HPE mode" };
      }

      else result = `Unknown node type: ${type}`;

      steps.push({ nodeId: id, type, input: data, output: result });
      output = result;

      const nextEdge = edges.find((e) => e.source === id);
      if (!nextEdge) break;

      current = nodes.find((n) => n.id === nextEdge.target);
    }

    return { ok: true, title, steps, finalOutput: output };
  } catch (e: any) {
    logError("UnifiedFlow Error: " + e.message);
    return { ok: false, error: e.message };
  }
}
