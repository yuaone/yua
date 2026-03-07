// 📂 src/ai/universal/universal-engine.ts
// 🔥 UNIVERSAL ENGINE — FINAL STRICT VERSION (Profile + Tone + Memory Safe + Cache)

import type { PlanId } from "../../types/plan-types";

import { runProviderAuto } from "../../service/provider-engine";
import type { ProviderOutput } from "../../service/provider-engine";

import { PluginEngine } from "./plugins/index";
import { AdvisorEngine } from "../advisor/advisor-engine";
import { toStringSafe } from "./utils-safe";

import { CachingEngine } from "../engines/caching-engine";
import { MemoryManager } from "../memory/legacy-memory-adapter";

import { BusinessReportEngine } from "../engines/report-engine.business";
import { Profiler } from "../utils/profiler";

export interface UniversalInput {
  message: string;
  tone?:
    | "반말"
    | "존댓말"
    | "친근"
    | "기술"
    | "기본"
    | "차분"
    | "전문가"
    | "논리적"
    | "짧게"
    | "길게";
  planId?: PlanId;
  userType?: "default" | "developer" | "business" | "advisor";
}

// --------------------------------------------------------
// util: clean answer
// --------------------------------------------------------
function cleanAnswer(text: string): string {
  if (!text) return "";
  return text.replace(/\bundefined\b/gi, "")
             .replace(/\bnull\b/gi, "")
             .trim();
}

// --------------------------------------------------------
// CoT Safe Wrapper
// --------------------------------------------------------
function wrapCoTSafe(prompt: string): string {
  return `
# 역할: YUA-AI Universal Engine

# 규칙
- 내부 Chain-of-Thought 절대 노출 금지
- reasoning 은 요약형만
- 위험/부정확 추론 즉시 차단

# 입력
${prompt}

# 출력 규칙
- 답변만 생성
- undefined/null 금지
`.trim();
}

// --------------------------------------------------------
// Tone Guide (strict)
// --------------------------------------------------------
const ToneGuideMap: Record<NonNullable<UniversalInput["tone"]>, string> = {
  반말: "편하고 자연스럽게 친구처럼 말해줘.",
  존댓말: "丁寧하고 자연스럽게 설명해줘.",
  친근: "따뜻하고 편안한 말투로 길게 설명해줘.",
  기술: "기술 문서 스타일로 정확하게 설명해줘.",
  기본: "자연스럽고 담백하게 설명해줘.",
  차분: "침착하고 느긋한 말투로 설명해줘.",
  전문가: "전문가 관점에서 정확하게 설명해줘.",
  논리적: "논리적 근거와 단계별 요약 포함해줘.",
  짧게: "짧고 핵심만 말해줘.",
  길게: "길고 자세하게 설명해줘."
};

// --------------------------------------------------------
// UniversalEngine MAIN
// --------------------------------------------------------
export const UniversalEngine = {
  async chat(input: UniversalInput): Promise<string> {
    const userMessage = input?.message?.trim() ?? "";
    if (!userMessage) return "메시지를 입력해줘!";

    const lower = userMessage.toLowerCase();
    let tone: UniversalInput["tone"] = input?.tone ?? "기본";

    // -----------------------------------------------------
    // A) 프로필 적용 (Option A + Option B 혼합)
    // -----------------------------------------------------
    let userType: UniversalInput["userType"] = input.userType ?? "default";

    // 자동 감지 (Option B)
    if (!input.userType) {
      if (/\b(오류|타입스크립트|ts|코드|빌드|개발)\b/.test(lower)) {
        userType = "developer";
      } else if (/\b(세금|매입|매출|부가세|경비|사업자)\b/.test(lower)) {
        userType = "business";
      } else if (/\b(설계도|아키텍처|architecture)\b/.test(lower)) {
        userType = "advisor";
      }
    }

    const profile = Profiler.load(userType) ?? {};

    // -----------------------------------------------------
    // 0) Cache
    // -----------------------------------------------------
    const cacheKey = CachingEngine.buildKeyFromPayload({
      message: userMessage,
      tone,
      userType,
      planId: input.planId ?? null
    });

    const cached = CachingEngine.get(cacheKey, { namespace: "universal" });
    if (typeof cached === "string") return cached;

    // -----------------------------------------------------
    // 1) PluginEngine
    // -----------------------------------------------------
    try {
      const pluginResult = await PluginEngine.try(userMessage);
      if (typeof pluginResult === "string" && pluginResult.trim() !== "") {
        const cleaned = cleanAnswer(pluginResult);
        CachingEngine.set(cacheKey, cleaned, { namespace: "universal" });
        return cleaned;
      }
    } catch {}

    // -----------------------------------------------------
    // 2) Tone Auto Detection
    // -----------------------------------------------------
    const toneKeywords: Record<string, UniversalInput["tone"]> = {
      설계도: "기술",
      아키텍처: "기술",
      architecture: "기술",
      전문가: "전문가",
      논리: "논리적",
      차분: "차분",
      조용: "차분"
    };

    for (const key in toneKeywords) {
      if (lower.includes(key)) {
        tone = toneKeywords[key] ?? tone;
        break;
      }
    }

    // -----------------------------------------------------
    // 3) Advisor Routing
    // -----------------------------------------------------
    const advisorKeys = ["설계도", "아키텍처", "architecture", "세무", "회계"];
    if (advisorKeys.some((k) => lower.includes(k))) {
      const adv = await AdvisorEngine.advise({ userMessage, mode: "advisor" });
      const cleaned = cleanAnswer(adv);
      CachingEngine.set(cacheKey, cleaned, { namespace: "universal" });
      return cleaned;
    }

    // -----------------------------------------------------
    // 4) Business Mode
    // -----------------------------------------------------
    const bizKeys = ["매출", "매입", "사업자", "부가세", "경비", "거래내역"];
    if (bizKeys.some((k) => lower.includes(k))) {
      const biz = await BusinessReportEngine.quickAnalyze({ message: userMessage });
      const cleaned = cleanAnswer(biz?.text ?? biz ?? "");
      CachingEngine.set(cacheKey, cleaned, { namespace: "universal" });
      return cleaned;
    }

    // -----------------------------------------------------
    // 5) Tone Guide + Profile Rule
    // -----------------------------------------------------
    const toneGuide = ToneGuideMap[tone] ?? ToneGuideMap["기본"];

    // -----------------------------------------------------
    // 6) Memory (완전 Safe)
    // -----------------------------------------------------
    const assembled = await MemoryManager.assembleMemory({ userMessage });

    // memoryToText 존재하면 사용하고, 없으면 fallback
    const recentMemory =
      (MemoryManager as any).memoryToText?.(assembled) ??
      assembled?.short ??
      assembled?.long ??
      "";

    // -----------------------------------------------------
    // 7) Prompt
    // -----------------------------------------------------
    const basePrompt = `
${toneGuide}

[PROFILE MODE: ${userType}]
${JSON.stringify(profile, null, 2)}

[최근 대화 패턴]
${recentMemory}

[사용자 메시지]
${userMessage}

[AI 답변]
`.trim();

    const finalPrompt = wrapCoTSafe(basePrompt);

    // -----------------------------------------------------
    // 8) ProviderAuto
    // -----------------------------------------------------
    try {
      const raw: ProviderOutput = await runProviderAuto(finalPrompt, {
        planId: input.planId,
        taskType: "chat"
      });

      const safeText = cleanAnswer(toStringSafe(raw.output ?? ""));

      MemoryManager.updateShortMemory(
   0,               // system userId
   userMessage,
   safeText
 );
      CachingEngine.set(cacheKey, safeText, { namespace: "universal" });

      return safeText;
    } catch (err: any) {
      const safeError = cleanAnswer(`오류 발생: ${String(err?.message || err)}`);
      CachingEngine.set(cacheKey, safeError, { namespace: "universal" });
      return safeError;
    }
  }
};
