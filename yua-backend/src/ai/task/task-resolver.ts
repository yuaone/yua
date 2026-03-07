// 🔒 TASK RESOLVER — SSOT FINAL (PHASE 4 · REFINED)
// -------------------------------------
// deterministic only
// no async
// no side-effect
// single TaskKind output

import type { TaskKind } from "./task-kind";
import type { ReasoningResult } from "../reasoning/reasoning-engine";
import {
  hasImageGenerationIntent,
  hasImageTransformIntentWithAttachment,
} from "../image/image-intent-detector";

export interface TaskResolveInput {
  message: string;
  reasoning: ReasoningResult;
  hasImage?: boolean;
  hasCodeBlock?: boolean;
  hasTypeError?: boolean;
  hasRuntimeError?: boolean;
  hasErrorLog?: boolean;
}

export function resolveTaskKind(
  input: TaskResolveInput
): TaskKind {
  const {
    message,
    reasoning,
    hasImage,
    hasCodeBlock,
    hasTypeError,
    hasRuntimeError,
    hasErrorLog,
  } = input;

  const text = message.trim();

  /* ================================================== */
  /* 🔥 1️⃣ IMAGE TASK RESOLUTION (STRICT PRIORITY)     */
  /* ================================================== */
  if (hasImage === true) {
    const t = String(text ?? "").trim();

    /* ----------------------------------------------- */
    /* 1) 🔥 강한 ANALYSIS 의도 (최우선 절대권)        */
    /* ----------------------------------------------- */
    const analysisIntent =
      /(분석|설명|해석|읽어줘?|읽어|인식해줘?|인식|무슨|뭐야|왜|어떻게|진단|확인|검토|비교|찾아|추출|텍스트|문구|번역|OCR|캡션|요약|정보|어디|누구|얼굴|나이|성별|브랜드|모델|여기\s*뭐\s*적혀|뭐\s*적혀|이거\s*뭐야|이거\s*읽어줘|이거\s*인식해줘)/i.test(t) ||
      /(what is|why|how|analy[sz]e|explain|describe|read|extract|translate|ocr|caption|summarize|recognize|identify)/i.test(t);

    if (analysisIntent) {
      return "IMAGE_ANALYSIS";
    }

    /* ----------------------------------------------- */
    /* 2) 🔥 TRANSFORM 의도 (바꿔줘/변환/스타일 변경)  */
    /* ----------------------------------------------- */
    if (hasImageTransformIntentWithAttachment(t)) {
      return "IMAGE_ANALYSIS";
    }

    /* ----------------------------------------------- */
    /* 3) 🔥 명시적 GENERATION 의도 (엄격 조건)        */
    /* ----------------------------------------------- */

    const genVerb =
      /(생성|만들|그려|제작|렌더|합성|추가)/i.test(t) ||
      /(generate|create|draw|render|make|compose|add)/i.test(t);

    const genObject =
      /(이미지|그림|사진|일러스트|포스터|썸네일|캐릭터|아바타|프로필|배경|버전)/i.test(t) ||
      /(image|picture|illustration|poster|thumbnail|avatar|profile|background|version)/i.test(t);

    const imperative =
      /(해줘|해주세요|줘|좀|만들어|그려줘|생성해줘|합성해줘|추가해줘)/i.test(t) ||
      /^(please|make|create|generate|draw|render|compose|add)\b/i.test(t);

    const strictKoreanShortGen =
      imperative &&
      (
        /(이미지\s*생성)/i.test(t) ||
        /(그림\s*그려)/i.test(t) ||
        /(사진\s*만들)/i.test(t) ||
        /(하나(\s*더)?\s*만들)/i.test(t) ||
        /(하나\s*더)/i.test(t) ||
        /(이거(로|로는)?\s*(하나|버전)\s*더)/i.test(t)
      );

    const generationIntent =
      (hasImageGenerationIntent(t) && imperative) ||
      (genVerb && genObject && imperative) ||
      strictKoreanShortGen;

    if (generationIntent) {
      return "IMAGE_GENERATION";
    }

    /* ----------------------------------------------- */
    /* 4) 기본값 → IMAGE_ANALYSIS                     */
    /* ----------------------------------------------- */
    return "IMAGE_ANALYSIS";
  }

  /* ================================================== */
  /* 🔒 텍스트 기반 이미지 생성 (첨부 없음)            */
  /* ================================================== */
  if (!hasImage && hasImageGenerationIntent(text)) {
    return "IMAGE_GENERATION";
  }

  /* ================================================== */
  /* 🔍 SEARCH / VERIFY                                */
  /* ================================================== */
  if (/(출처|근거|맞는지|사실|팩트|verify|source)/i.test(text)) {
    return "SEARCH";
  }

  /* ================================================== */
  /* 🛠 ERROR FIX                                       */
  /* ================================================== */
  if (hasTypeError === true) {
    return "TYPE_ERROR_FIX";
  }

  if (hasRuntimeError === true || hasErrorLog === true) {
    return "RUNTIME_ERROR_FIX";
  }

  /* ================================================== */
  /* 💻 CODE CONTEXT                                    */
  /* ================================================== */
  if (hasCodeBlock === true) {
    if (message.length > 8000) {
      return "CODE_REVIEW";
    }

    if (/(리팩토링|구조 개선|정리|cleanup|refactor)/i.test(text)) {
      return "REFACTOR";
    }

    if (/(리뷰|문제|어디|왜|원인|잘못|설명|흐름)/i.test(text)) {
      return "CODE_REVIEW";
    }

    if (/(작성|만들어|생성|구현|코드로|짜줘)/i.test(text)) {
      return "CODE_GENERATION";
    }

    return "CODE_REVIEW";
  }

  /* ================================================== */
  /* 🧠 Reasoning 보정                                  */
  /* ================================================== */
  if (
    reasoning.domain === "dev" &&
    (reasoning.intent === "execute" || reasoning.userStage === "ready")
  ) {
    return "CODE_GENERATION";
  }

  switch (reasoning.intent) {
    case "debug":
      return "CODE_REVIEW";
    case "design":
    case "execute":
    case "decide":
      return "DIRECT_CHAT";
    default:
      break;
  }

  return "DIRECT_CHAT";
}
