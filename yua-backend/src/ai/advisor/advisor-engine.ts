// 📂 src/ai/advisor/advisor-engine.ts
// 🔥 YUA-AI — Advisor Engine (SSOT ALIGNED)

import { MemoryManager } from "../memory/legacy-memory-adapter";
import { TokenSafety } from "../safety/token-safety";
import { DomainSafety } from "../safety/domain-safety";
import { runProviderAuto } from "../../service/provider-engine";
import { LoggingEngine } from "../engines/logging-engine";
import { FastCache } from "../memory/fast-cache";
import { MemoryVectorSync } from "../memory/memory-vector-sync";

/* ---------- helpers ---------- */

function cleanAnswer(text: string): string {
  if (!text) return "";
  return text
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toStringSafe(raw: any): string {
  try {
    if (!raw) return "";
    if (typeof raw === "string") return cleanAnswer(raw);
    if (typeof raw.text === "string") return cleanAnswer(raw.text);
    if (typeof raw.output === "string") return cleanAnswer(raw.output);
    return cleanAnswer(JSON.stringify(raw));
  } catch {
    return "";
  }
}

/* ---------- types ---------- */

export interface AdvisorInput {
  userMessage: string;
  projectId?: string;
  mode?: string;
}

/* ---------- engine ---------- */

export const AdvisorEngine = {
  detectDomain(msg: string, mode: string = "default"): string {
    const lower = msg.toLowerCase();
    if (mode === "tax") return "tax_accounting";
    if (mode === "developer") return "software_engineering";
    if (lower.includes("세무")) return "tax_accounting";
    if (lower.includes("개발")) return "software_engineering";
    return "general";
  },

  async preparePrompt(input: AdvisorInput): Promise<string> {
    await MemoryManager.assembleMemory({
      userMessage: input.userMessage,
      projectId: input.projectId,
    });

    const domain = this.detectDomain(input.userMessage, input.mode);
    const domainNotice = DomainSafety.buildSafetyNotice(
      DomainSafety.validateRequest(input.userMessage)
    );

    const prompt = `
당신은 YUA-AI Advisor 입니다.

[도메인] ${domain}

${domainNotice || ""}

[사용자 질문]
${input.userMessage}
`.trim();

    const safety = await TokenSafety.stabilize(prompt, { stream: false });
    if (safety.status === "OVERFLOW") {
      throw new Error("INPUT_TOKEN_OVERFLOW");
    }

    return prompt;
  },

  async advise(input: AdvisorInput): Promise<string> {
    const startedAt = Date.now();

    try {
      const prompt = await this.preparePrompt(input);
      const raw = await runProviderAuto(prompt);
      const cleaned = toStringSafe(raw);

      FastCache.set("advisor_last_answer", cleaned);
      MemoryVectorSync.sync(input.userMessage, cleaned);

      await LoggingEngine.record({
        route: "advisor",
        method: "POST",
        request: input,
        response: { answer: cleaned },
        latency: Date.now() - startedAt,
        status: "success",
      });

      return cleaned;
    } catch (err: any) {
      const msg = cleanAnswer(String(err));

      await LoggingEngine.record({
        route: "advisor",
        method: "POST",
        request: input,
        response: { error: msg },
        latency: Date.now() - startedAt,
        status: "error",
        error: msg,
      });

      return msg;
    }
  },
};
