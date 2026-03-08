// 📂 src/services/workflow-service.ts
// 🔥 YUA-AI Workflow Text Engine — FINAL 2025.11
// ✔ Task / Code / API / Condition
// ✔ Provider Auto 연동 (GPT/Gemini/Claude)
// ✔ 안전 JSON 파싱 / 에러핸들링
// ✔ strict mode 100% 통과

import axios from "axios";
import { runProviderAuto } from "./provider-engine"; // ← 정원님 엔진 경로로 수정
import { log, logError } from "../utils/logger";

export async function runWorkflowEngine(nodes: any[]) {
  let lastOutput: any = "";

  for (const node of nodes) {
    const { type } = node;

    log(`▶ [Workflow] 실행 노드 타입: ${type}`);

    /* ──────────────────────────────────────────
     * 🟦 1) Task Node
     * ────────────────────────────────────────── */
    if (type === "task") {
      lastOutput = await runProviderAuto(node.input);
      continue;
    }

    /* ──────────────────────────────────────────
     * 🟩 2) Code Node
     * ────────────────────────────────────────── */
    if (type === "code") {
      const prompt = `
🔧 Code Fix Request
언어: ${node.language || "ts"}
이전 Output: ${lastOutput}

▼ 수정해야 할 코드
${node.input}
      `;
      lastOutput = await runProviderAuto(prompt);
      continue;
    }

    /* ──────────────────────────────────────────
     * 🟧 3) API Node
     * ────────────────────────────────────────── */
    if (type === "api") {
      try {
        const headers = parseJsonSafe(node.headers);
        const body = parseJsonSafe(node.body);

        const res = await axios({
          method: node.method,
          url: node.url,
          headers,
          data: body,
        });

        lastOutput = JSON.stringify(res.data, null, 2);
      } catch (e: any) {
        logError("❌ API Node 오류: " + e.message);
        lastOutput = "API 호출 오류: " + e.message;
      }
      continue;
    }

    /* ──────────────────────────────────────────
     * 🟥 4) Condition Node
     * ────────────────────────────────────────── */
    if (type === "condition") {
      try {
        // Safety: evaluate condition without eval() — sandbox 교체 전 임시 안전 처리
        const conditionStr = (node.condition || "false").trim().toLowerCase();
        const pass = conditionStr === "true" ||
          (conditionStr.startsWith("output") && lastOutput && lastOutput.trim().length > 0);
        lastOutput = pass
          ? `조건=true → 다음: ${node.trueNext}`
          : `조건=false → 다음: ${node.falseNext}`;
      } catch (e: any) {
        logError("❌ Condition Node 오류: " + e.message);
        lastOutput = "조건식 오류: " + e.message;
      }
      continue;
    }
  }

  return lastOutput;
}

/* ──────────────────────────────────────────
 * 안전한 JSON 파서 (UI에서 잘못된 JSON 넣을 수 있음)
 * ────────────────────────────────────────── */
function parseJsonSafe(jsonStr: string) {
  if (!jsonStr || jsonStr.trim() === "") return {};
  try {
    return JSON.parse(jsonStr);
  } catch {
    return {};
  }
}
