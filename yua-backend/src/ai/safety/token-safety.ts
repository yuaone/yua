  // 📂 src/ai/safety/token-safety.ts
  // 🔥 YUA-AI — Token Safety Layer (PHASE 1 FINAL)
  // -------------------------------------------------------------
  // ✔ TokenSafety = Guard ONLY
  // ✔ 프롬프트 변조 ❌
  // ✔ 영어 degrade ❌
  // ✔ 토큰 초과 시 명확한 판정만 반환
  // ✔ ExecutionEngine이 최종 통제
  // -------------------------------------------------------------

  import { estimateTokens } from "../../utils/tokenizer";
  import { log } from "../../utils/logger";

  /* --------------------------------------------------
  * Utilities
  * -------------------------------------------------- */
  function clean(text: string): string {
    if (typeof text !== "string") {
      throw new Error("SSOT_VIOLATION: prompt must be string");
    }
    return text.trim(); // ❗ 내용 변형 금지
  }

  /* --------------------------------------------------
  * Meta
  * -------------------------------------------------- */
  export interface TokenSafetyMeta {
    ssot?: boolean;
    mode?: "FAST" | "NORMAL" | "SEARCH" | "DEEP" | "BENCH" | "RESEARCH";
    nonSummarizable?: boolean;
    stream?: boolean;
  }

  /* --------------------------------------------------
  * Result Type (SSOT)
  * -------------------------------------------------- */
  export type TokenSafetyResult =
    | {
        status: "OK";
        tokens: number;
      }
    | {
        status: "OVERFLOW";
        tokens: number;
      };

  /* --------------------------------------------------
  * Config
  * -------------------------------------------------- */
  interface SafetyConfig {
    maxInputTokens: number;
    chunkSize: number;
  }

  /* --------------------------------------------------
  * TokenSafety (GUARD ONLY)
  * -------------------------------------------------- */
  export const TokenSafety = {
    config: <SafetyConfig>{
      maxInputTokens: 2500,
      chunkSize: 1000,
    },

    /* --------------------------------------------------
    * INPUT SAFETY — 판정 ONLY
    * -------------------------------------------------- */
    async stabilizeInput(
      prompt: string,
      _meta?: TokenSafetyMeta
    ): Promise<TokenSafetyResult> {
      const safePrompt = clean(prompt || "");

      if (!safePrompt || safePrompt.length === 0) {
        throw new Error("SSOT_VIOLATION_EMPTY_PROMPT");
      }

      const tokenCount = estimateTokens(safePrompt);

      // ✅ 정상 범위
  const max =
    _meta?.mode === "DEEP" && _meta?.nonSummarizable === true
      ? 9000
      : this.config.maxInputTokens;

  if (tokenCount <= max) {
        return {
          status: "OK",
          tokens: tokenCount,
        };
      }

      // 🔒 OVERFLOW 판정 (행동은 상위에서 결정)
      log(`🟧 [TokenSafety] INPUT_TOKEN_OVERFLOW(${tokenCount})`);

 // 🔥 SSOT: stream이라도 "OVERFLOW 신호는 유지"
 if (_meta?.stream === true) {
   return { status: "OVERFLOW", tokens: tokenCount };
 }

      // 🔒 NON-STREAM은 기존 정책 유지
      return {
        status: "OVERFLOW",
        tokens: tokenCount,
      };
    },

    /* --------------------------------------------------
    * OUTPUT CHUNKING (TRANSPORT ONLY)
    * -------------------------------------------------- */
    chunkOutput(text: string): string[] {
      const t = clean(text);
      const out: string[] = [];
      const size = this.config.chunkSize;

      for (let i = 0; i < t.length; i += size) {
        out.push(t.slice(i, i + size));
      }

      return out;
    },

    /* --------------------------------------------------
    * FINAL WRAPPER (PHASE 1)
    * -------------------------------------------------- */
    async stabilize(
      prompt: string,
      meta?: TokenSafetyMeta
    ): Promise<TokenSafetyResult> {
      const safePrompt = clean(prompt);

      const result = await this.stabilizeInput(safePrompt, meta);

      log("[TRACE][TOKEN_SAFETY_RESULT]", {
        status: result.status,
        tokens: result.tokens,
      });

      return result;
    },
  };
