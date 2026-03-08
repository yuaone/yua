// 📂 src/ai/workflow/workflow-runner.ts
// 🔥 YA-ENGINE Workflow Runner — HPE 3.0 EXTENDED FINAL

import axios from "axios";

import { ChatEngine } from "../engines/chat-engine";
import { ComputeEngine } from "../engines/compute-engine";
import { GuardrailManager } from "../guardrails/guardrail-manager";

import { KBEngine } from "../kb/kb-engine";
import { runFileAnalysis } from "../file/file-engine";
import { VisionEngine } from "../engines/vision-engine";
import { IntentEngine } from "../intent/intent-engine";

// ⭐ HPE 3.0 ENGINE 추가
import { runHPEEngine } from "../hpe/hpe-engine";

export class WorkflowRunner {
  static async run(flow: any) {
    const results: any[] = [];

    for (const node of flow.nodes) {
      const type = node.type;
      const data = node;
      let output: any = null;

      switch (type) {
        // -------------------------------------------------
        // 🧠 TASK (Chat)
        // -------------------------------------------------
        case "task":
          output = await ChatEngine.generateResponse(
            data.input ?? "",
            { role: "workflow" }
          );
          break;

        // -------------------------------------------------
        // 💻 CODE
        // -------------------------------------------------
        case "code":
          output = await ComputeEngine.run({
            language: data.language,
            code: data.input,
          });
          break;

        // -------------------------------------------------
        // 🌐 API
        // -------------------------------------------------
        case "api":
          try {
            const res = await axios({
              method: data.method ?? "GET",
              url: data.url,
              headers: data.headers ?? {},
              data: data.body ?? {},
            });
            output = res.data;
          } catch (e: any) {
            output = { ok: false, error: e?.message || "API 호출 오류" };
          }
          break;

        // -------------------------------------------------
        // 🔀 CONDITION
        // -------------------------------------------------
        case "condition":
          try {
            // Safety: evaluate condition without eval() — sandbox 교체 예정
            const condStr = (data.condition ?? "false").trim().toLowerCase();
            const cond = condStr === "true";
            output = {
              ok: true,
              value: cond,
              next: cond ? data.trueNext : data.falseNext,
            };
          } catch (e: any) {
            output = { ok: false, error: "조건 처리 오류: " + e.message };
          }
          break;

        // -------------------------------------------------
        // 📚 KB
        // -------------------------------------------------
        case "kb":
          output = await KBEngine.search(data.query);
          break;

        // -------------------------------------------------
        // 📎 FILE
        // -------------------------------------------------
        case "file":
          output = await runFileAnalysis({
            fileBase64: data.fileBase64 ?? "",
            fileName: data.fileName,
            userId: data.userId,
          });
          break;

        // -------------------------------------------------
        // 🖼 IMAGE
        // -------------------------------------------------
        case "image":
          output = await VisionEngine.analyzeImage(data.imageUrl);
          break;

        // -------------------------------------------------
        // 🔌 PROVIDER (Chat)
        // -------------------------------------------------
        case "provider":
          output = await ChatEngine.generateResponse(
            data.prompt ?? "",
            { role: "workflow" }
          );
          break;

        // -------------------------------------------------
        // 🧭 INTENT
        // -------------------------------------------------
        case "intent":
          output = await IntentEngine.detect(data.input);
          break;

        // -------------------------------------------------
        // 🛡 GUARDRAIL
        // -------------------------------------------------
        case "guardrail":
          const r = GuardrailManager.analyze(data.input ?? "");
          output = {
            ok: !r.blocked,
            blocked: r.blocked,
            reason: r.reason,
            source: r.source,
          };
          break;

        // -------------------------------------------------
        // ⭐ HPE 3.0
        // -------------------------------------------------
        case "hpe":
          output = await runHPEEngine({
            input: data.hpeInput ?? data.input ?? "",
            context: data.hpeContext ?? [],
          });
          break;

        // -------------------------------------------------
        // ❌ UNKNOWN
        // -------------------------------------------------
        default:
          output = { error: "Unknown node type: " + type };
      }

      results.push({
        nodeId: node.id,
        type,
        output,
      });
    }

    return { ok: true, results };
  }
}
