// 📂 src/service/providers/provider-engine.ts
// 🔥 HPE 3.0 Provider Engine — HYBRID D ULTRA FINAL (2025.11)
// -------------------------------------------------------------
// - Plan 기반 Provider 라우팅
// - Micro Cache(5초)
// - 기존 시그니처 100% 유지
// - HPE 3.0 Provider 구조에 맞춘 완전 호환
// - runGPT/runGemini/runClaude 제거 → HPE 방식 적용
// -------------------------------------------------------------

import fs from "fs";
import path from "path";

// 🔥 logger 경로 수정
import { log, logError } from "../utils/logger";

// 🔥 Provider 구조 수정
import { GPTProvider as OpenAIProvider } from "./providers/gpt-provider";
import { GeminiProvider } from "./providers/gemini-provider";
import { ClaudeProvider } from "./providers/claude-provider";
import { runHPEEngine as HPEProvider } from "../ai/hpe/hpe-engine";

import type { PlanId } from "../types/plan-types";


// -------------------------------------------------------------
// 타입 정의
// -------------------------------------------------------------
export interface ProviderOutput {
  provider: string;
  output: string;
  error?: string;
}

export interface ProviderAutoOptions {
  planId?: PlanId;
  taskType?: "chat" | "business" | "dev" | "report" | "system";
  userId?: string;
}

// -------------------------------------------------------------
// Micro Cache (5초)
// -------------------------------------------------------------
const microCache = new Map<string, { ts: number; value: ProviderOutput }>();
const MICRO_TTL = 5000;

function getMicroCached(key: string): ProviderOutput | null {
  const item = microCache.get(key);
  if (!item) return null;
  if (Date.now() - item.ts > MICRO_TTL) return null;
  return item.value;
}

function setMicroCached(key: string, value: ProviderOutput) {
  microCache.set(key, { ts: Date.now(), value });
}

// -------------------------------------------------------------
// Provider 선택 로직 (Plan-aware)
// -------------------------------------------------------------
function selectProviderForPlan(
  defaultProvider: string,
  options?: ProviderAutoOptions
): string {
  if (!options) return defaultProvider;

  const { planId, taskType } = options;
  let provider = defaultProvider;

  switch (planId) {
    case "free":
      provider = "gpt";
      break;

    case "premium":
    case "business_premium":
      provider = "gpt";
      break;

    case "developer":
    case "developer_pro":
    case "enterprise_developer":
      provider = "gpt";
      break;

    default:
      provider = defaultProvider;
  }

  if (
    taskType === "dev" &&
    (planId === "developer" || planId === "developer_pro")
  ) {
    provider = provider || "gpt";
  }

  log(
    `🔧 ProviderAuto PlanRoute => plan=${planId ?? "none"}, taskType=${taskType ??
      "none"}, provider=${provider}`
  );

  return provider || defaultProvider;
}

// -------------------------------------------------------------
// 🔥 ProviderAuto 실행
// -------------------------------------------------------------
export async function runProviderAuto(
  prompt: string,
  options: ProviderAutoOptions = {}
): Promise<ProviderOutput> {
  try {
    const cacheKey = `${options.planId ?? "none"}|${options.taskType}|${prompt}`;
    const cached = getMicroCached(cacheKey);
    if (cached) return cached;

    const filePath = path.join(process.cwd(), "config-provider.json");
    let provider: string = "gpt";

    // config-provider.json 읽기
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        const json = JSON.parse(raw);

        if (typeof json.provider === "string") provider = json.provider;
      } catch {
        logError("⚠ config-provider.json 파싱 오류 → gpt fallback");
        provider = "gpt";
      }
    }

    // 플랜 기반 선택
    provider = selectProviderForPlan(provider, options);

    log(`🔧 Provider 선택됨: ${provider}`);

    let result: any;

    // ⭐ HPE 3.0 Provider 호출 구조 적용
    switch (provider) {
      case "gpt":
        result = await safeCall(OpenAIProvider, prompt);
        break;

      case "gemini":
        result = await safeCall(GeminiProvider, prompt);
        break;

      case "claude":
        result = await safeCall(ClaudeProvider, prompt);
        break;

      case "hpe":
        result = await safeCall(HPEProvider, prompt);
        break;

      default:
        logError(`⚠ Unknown provider '${provider}' → gpt fallback`);
        result = await safeCall(OpenAIProvider, prompt);
    }

    const finalResult: ProviderOutput = {
      provider,
      output: extractOutput(result),
      error: extractError(result),
    };

    // micro-cache 저장
    setMicroCached(cacheKey, finalResult);

    return finalResult;
  } catch (e: any) {
    logError("❌ Provider 자동 실행 오류: " + e.message);

    return {
      provider: "unknown",
      output: "",
      error: e.message,
    };
  }
}

// -------------------------------------------------------------
// 명시적 Provider 실행
// -------------------------------------------------------------
export async function runProvider(args: {
  type?: string;
  provider?: string;
  input: string;
  language?: string;
  prev?: any;
  planId?: PlanId;
  taskType?: "chat" | "business" | "dev" | "report" | "system";
}): Promise<ProviderOutput> {
  const {
    type = "task",
    provider = "gpt",
    input,
    language = "dart",
    prev = null,
    planId,
    taskType = "system",
  } = args;

  const prompt = `
유형: ${type}
언어: ${language}
이전 출력: ${JSON.stringify(prev)}
입력:
${input}
  `.trim();

  return await runProviderAuto(prompt, { planId, taskType });
}

// -------------------------------------------------------------
// Helper: 안전 호출
// -------------------------------------------------------------
async function safeCall(fn: Function, prompt: string): Promise<any> {
  try {
    return await fn(prompt);
  } catch (e: any) {
    logError("❌ Provider 호출 실패: " + e.message);
    return { output: "", error: e.message };
  }
}

// -------------------------------------------------------------
// Helper: output 추출
// -------------------------------------------------------------
function extractOutput(result: any): string {
  try {
    if (!result) return "";

    let text = "";

    if (typeof result.output === "string") text = result.output;
    else if (typeof result.text === "string") text = result.text;
    else if (typeof result.content === "string") text = result.content;
    else if (typeof result === "string") text = result;
    else if (Array.isArray(result) && typeof result[0] === "string")
      text = result[0];
    else text = "";

    return text.replace(/undefined/gi, "").replace(/null/gi, "").trim();
  } catch {
    return "";
  }
}

// -------------------------------------------------------------
// Helper: error 추출
// -------------------------------------------------------------
function extractError(result: any): string | undefined {
  if (!result) return "unknown error";
  if (typeof result.error === "string") return result.error;
  return undefined;
}
