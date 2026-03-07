// 📂 src/ai/reasoning/reasoning-engine.ts
// 🔥 YUA-AI Reasoning Engine — SSOT STEP 2 (FLOW-AWARE, NO LLM)
// -----------------------------------------------------
// ✔ 상태 판단 전용 (NO LLM)
// ✔ NO Memory Access
// ✔ NO async
// ✔ 순수 함수
// ✔ Weighted feature scoring (ultra heuristic)
// ✔ GPT/Gemini/Claude-style "flow anchoring" (anchors only, NO narration)
// -----------------------------------------------------

import { analyzeCodeAST } from "../capability/code/code-ast-engine";
import { analyzeMathGraph } from "../capability/math/math-graph-engine";
import type { PathType } from "../../routes/path-router";
import type { ChatMode } from "../chat/types/chat-mode";

export type FlowAnchor =
  | "VISION_PRIMARY"
  | "REFINE_INPUT"
  | "EXPAND_SCOPE"
  | "VERIFY_LOGIC"
  | "COMPARE_APPROACH"
  | "IMPLEMENT"
  | "SUMMARIZE"
  | "NEXT_STEP"
  | "BRANCH_MORE";

  export type TurnIntent =
  | "QUESTION"
  | "REACTION"
  | "AGREEMENT"
  | "CONTINUATION"
  | "SHIFT";

export type ReasoningResult = {
  intent: "ask" | "design" | "debug" | "decide" | "execute";
  userStage: "confused" | "ready" | "looping";
  domain: "dev" | "biz" | "law" | "etc";
  confidence: number; // 0~1
  anchors?: FlowAnchor[];

  // 🔥 upgrades
  cognitiveLoad: "low" | "medium" | "high";
  depthHint: "shallow" | "normal" | "deep";
  // 🔒 SSOT: Scheduler input only (NO decision usage here)
 codeFeatures?: import("../capability/code/code-ast-types").CodeASTFeatures;
  mathFeatures?: import("../capability/math/math-graph-types").MathGraphFeatures;

  /**
   * 다음 흐름의 고정점(Anchor)
   * - 제안엔진만 사용
   * - 판단/강제/문장 생성 ❌
   */
  nextAnchors: FlowAnchor[];
  __internal?: {
    turnIntent: TurnIntent;
  };
  decisionProposal?: DecisionProposal;
};

export type IntentType = ReasoningResult["intent"];
export type StageType = ReasoningResult["userStage"];
export type ModeType = Extract<ChatMode, "FAST" | "NORMAL" | "DEEP">;

export type DecisionProposal = {
  intent: IntentType;
  stage: StageType;
  mode: ModeType;
  path: PathType;
  confidence: number;
  rationale?: string;
};

interface ReasoningInput {
  input: string;
  turnIntent?: TurnIntent; 
  turnFlow?: "NEW" | "FOLLOW_UP" | "ACK_CONTINUE" | "TOPIC_SHIFT";
  hasImage?: boolean; // 🔥 SSOT: multimodal signal
  wantsImageGeneration?: boolean; // 🔥 SSOT: Decision-derived signal (NO inference here)
  // 🔒 FLOW STABILIZATION (optional)
  prevHint?: {
    userStage?: ReasoningResult["userStage"];
  };
}

function inferProposalModeAndPath(args: {
  intent: IntentType;
  stage: StageType;
  confidence: number;
  depthHint: ReasoningResult["depthHint"];
}): { mode: ModeType; path: PathType } {
  const { intent, stage, confidence, depthHint } = args;

  if (intent === "design" || intent === "debug") {
    return { mode: "DEEP", path: "DEEP" };
  }

  if (stage === "ready" && depthHint === "shallow" && confidence < 0.75) {
    return { mode: "FAST", path: "FAST" };
  }

  return { mode: "NORMAL", path: "NORMAL" };
}

function withDecisionProposal(
  result: Omit<ReasoningResult, "decisionProposal">,
  rationale?: string
): ReasoningResult {
  const inferred = inferProposalModeAndPath({
    intent: result.intent,
    stage: result.userStage,
    confidence: result.confidence,
    depthHint: result.depthHint,
  });

  return {
    ...result,
    decisionProposal: {
      intent: result.intent,
      stage: result.userStage,
      mode: inferred.mode,
      path: inferred.path,
      confidence: result.confidence,
      rationale,
    },
  };
}

/* -------------------------------------------------- */
/* Utils                                              */
/* -------------------------------------------------- */

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function norm(text: string): string {
  return (text ?? "").trim();
}

 function isDirectChat(text: string): boolean {
   const t = text.trim();

    return (
   t.length <= 25 &&
   (
     // 짧은 의문형
     /\?$/.test(t) ||

     // 범용 상태/사실/확인 질문
     /(뭐야|뭔데|왜|어때|어떰|맞아|맞지|이게|이거|지금|현재|상태|문제|정상)/.test(t)
   )
 );
 }

 // 🔥 SSOT: 한국어 구어체 실행/안내 요청
function isCasualActionRequest(text: string): boolean {
  return (
    /(해줘|알려줘|안내해줘|정리해줘|보여줘|말해줘)$/i.test(text.trim())
  );
}

type ScoreMap<T extends string> = Record<T, number>;

type PatternRule<T extends string> = {
  key: T;
  patterns: RegExp[];
  weight: number;
};

function scoreByRules<T extends string>(
  text: string,
  rules: PatternRule<T>[]
): { scores: ScoreMap<T>; evidence: { key: T; hits: number; weight: number }[] } {
  const scores = {} as ScoreMap<T>;
  const evidence: { key: T; hits: number; weight: number }[] = [];

  for (const r of rules) {
    if (scores[r.key] === undefined) scores[r.key] = 0;

    let hits = 0;
    for (const p of r.patterns) {
      if (p.test(text)) hits += 1;
    }
    if (hits > 0) {
      scores[r.key] += r.weight * hits;
      evidence.push({ key: r.key, hits, weight: r.weight });
    }
  }
  return { scores, evidence };
}

function pickTop<T extends string>(scores: ScoreMap<T>, fallback: T): T {
  let bestKey: T = fallback;
  let best = -Infinity;

  for (const k of Object.keys(scores) as T[]) {
    const v = scores[k];
    if (v > best) {
      best = v;
      bestKey = k;
    }
  }
  return bestKey;
}

function topGapOf(scores: Record<string, number>): number {
  const vals = Object.values(scores).sort((a, b) => b - a);
  if (vals.length < 2) return 0;
  return vals[0] - vals[1];
}

/* -------------------------------------------------- */
/* Rules: Domain / Intent / Stage                      */
/* -------------------------------------------------- */

const DOMAIN_RULES: PatternRule<ReasoningResult["domain"]>[] = [
  {
    key: "dev",
    weight: 1.6,
    patterns: [
      /(코드|개발|버그|에러|오류|리팩토링|테스트|빌드|배포|서버|api|db|캐시|redis|kafka|typescript|node|next|react|zustand|sse|stream)/i,
      /(함수|클래스|타입|인터페이스|모듈|라우터|미들웨어|컨트롤러|엔진)/i,
    ],
  },
  {
    key: "biz",
    weight: 1.5,
    patterns: [
      /(매출|회계|세무|비용|사업자|리포트|손익|부가세|정산|매입|매출채권|현금흐름)/i,
      /(투자|피치|IR|고객|유저|시장|전략|BM|수익화)/i,
    ],
  },
  {
    key: "law",
    weight: 1.7,
    patterns: [
      /(법률|계약|위반|합법|규정|조항|책임|소송|특허|저작권|개인정보|보안|규제)/i,
    ],
  },
  {
    key: "etc",
    weight: 0.2,
    patterns: [/.*/], // fallback bucket; 낮은 가중치
  },
];

const INTENT_RULES: PatternRule<ReasoningResult["intent"]>[] = [
  {
    key: "design",
    weight: 1.5,
    patterns: [
      /(설계|구조|아키텍처|architecture|design|패턴|SSOT|스펙|모듈화|확장)/i,
      /(어떻게\s+(설계|구현|적용|구조)|구현\s*방법|설계\s*방법|아키텍처)/i,
    ],
  },
  {
    key: "debug",
    weight: 1.6,
    patterns: [
      /(에러|오류|버그|깨짐|안됨|crash|exception|stack|원인|왜|문제)/i,
      /(고쳐|fix|디버그|해결)/i,
    ],
  },
  {
    key: "decide",
    weight: 1.4,
    patterns: [
      /(선택|비교|결정|뭐가|vs|추천|트레이드오프|장단점)/i,
    ],
  },
  {
    key: "execute",
    weight: 1.3,
    patterns: [
      /(실행|적용|배포|반영|바로|진행|해줘|해라|해줄래|만|딱|ㄱㄱ)/i,
    ],
  },
  {
    key: "ask",
    weight: 1.1,
    patterns: [
      /(설명|알려줘|뭐야|정리|요약)/i,
      /(왜|어때|어떰|맞아|맞지|뭔지|무슨|어떤|어디|언제|지금|현재|상태)/i,
      /\?$/i,
    ],
  },
];

const STAGE_RULES: PatternRule<ReasoningResult["userStage"]>[] = [
  {
    key: "confused",
    weight: 1.6,
    patterns: [
      /(모르겠|헷갈|이해 안|이해가 안|왜이래|갑자기|뭐지|멘붕)/i,
      /(안 돼|안됨|안돼|깨져|터져)/i,
    ],
  },
  {
    key: "looping",
    weight: 1.5,
    patterns: [
      /(계속|다시|또|반복|여전히|아까랑|똑같이|2달)/i,
    ],
  },
  {
    key: "ready",
    weight: 1.3,
    patterns: [
      /(이제|바로|가자|진행|다음 단계|스텝|step|붙이자|넣자|연결|diff로|적용해)/i,
    ],
  },
];

/* -------------------------------------------------- */
/* Confidence model                                    */
/* -------------------------------------------------- */

function computeConfidence(params: {
  inputLen: number;
  evidenceCount: number;
  topGap: number;
  stage: ReasoningResult["userStage"];
}): number {
  const { inputLen, evidenceCount, topGap, stage } = params;

  const lenScore = clamp01(inputLen / 180); // 180자 정도면 1에 근접
  const evScore = clamp01(evidenceCount / 6); // 6개 이상 증거면 안정
  const gapScore = clamp01(topGap / 2.5); // 2.5 이상 점수차면 매우 확신

  const stageBias =
    stage === "ready"
      ? 0.12
      : stage === "confused"
      ? -0.12
      : stage === "looping"
      ? -0.06
      : 0.04;

      // 🔒 loop 반복 시 confidence 과열 방지 (외부에서 clamp)

  const raw =
    0.25 +
    0.35 * lenScore +
    0.25 * evScore +
    0.25 * gapScore +
    stageBias;

  return Number(clamp01(raw).toFixed(2));
}

/* -------------------------------------------------- */
/* Confidence Stabilizer (SSOT: anti overconfidence)   */
/* -------------------------------------------------- */

function stabilizeConfidence(params: {
  base: number;
  prevStage?: ReasoningResult["userStage"];
  stage: ReasoningResult["userStage"];
  turnIntent: TurnIntent;
}): number {
  const { base, prevStage, stage, turnIntent } = params;

  // 기본은 "올려주지 않는다" (과확신 방지)
  let c = clamp01(base);

  // 같은 looping 연속이면 감쇠
  if (prevStage === "looping" && stage === "looping") {
    c = clamp01(c - 0.05);
  }

  // confused/looping은 상한을 더 낮게 (흔들림 억제)
  if (stage === "confused") c = Math.min(c, 0.55);
  if (stage === "looping") c = Math.min(c, 0.60);

  return Number(clamp01(c).toFixed(2));
}

/* -------------------------------------------------- */
/* Upgrades: Load / Depth / Anchors                    */
/* -------------------------------------------------- */

function estimateCognitiveLoad(text: string): "low" | "medium" | "high" {
  const t = text.trim();
  if (t.length >= 520) return "high";
  if (t.length >= 220) return "medium";
  return "low";
}

function estimateDepthHint(
  intent: ReasoningResult["intent"],
  stage: ReasoningResult["userStage"],
  domain: ReasoningResult["domain"]
): "shallow" | "normal" | "deep" {
  // confused/looping일수록 깊게 들어가면 더 망함 → shallow
  if (stage === "confused" || stage === "looping") return "shallow";

  // design/debug는 deep 성향
  if (intent === "design" || intent === "debug") return "deep";

  // law는 과대확신 방지 → normal로 제한
  if (domain === "law") return "normal";

  return "normal";
}

function inferNextAnchors(params: {
  intent: ReasoningResult["intent"];
  stage: ReasoningResult["userStage"];
  depth: "shallow" | "normal" | "deep";
  domain: ReasoningResult["domain"];
}): FlowAnchor[] {
  const { intent, stage } = params;

  // 🔒 SSOT: deterministic decision table
  if (intent === "ask") {
    return stage === "confused"
      ? ["REFINE_INPUT"]
      : stage === "looping"
      ? ["REFINE_INPUT"]
      : ["NEXT_STEP"];
  }

  if (intent === "design") {
    return stage === "confused"
      ? ["REFINE_INPUT"]
      : stage === "looping"
      ? ["VERIFY_LOGIC"]
      : ["EXPAND_SCOPE"];
  }

  if (intent === "debug") {
    return stage === "ready"
      ? ["IMPLEMENT"]
      : ["VERIFY_LOGIC"];
  }

  if (intent === "decide") {
    return stage === "looping"
      ? ["COMPARE_APPROACH"]
      : ["NEXT_STEP"];
  }

  if (intent === "execute") {
    return stage === "ready"
      ? ["IMPLEMENT"]
      : ["REFINE_INPUT"];
  }

  // 🔒 absolute fallback (never empty)
  return ["NEXT_STEP"] as FlowAnchor[];
 }

/* -------------------------------------------------- */
/* Anchor Stabilizer (FLOW SAFETY)                     */
/* -------------------------------------------------- */

function stabilizeAnchors(
  anchors: FlowAnchor[],
  max: number = 3
): FlowAnchor[] {
    // ✅ TS가 string[]로 widen 하는 케이스 방지
  const unique: FlowAnchor[] = Array.from(
    new Set<FlowAnchor>(anchors)
  ) as FlowAnchor[];

  const NEXT: FlowAnchor = "NEXT_STEP";

  // 🔒 NEXT_STEP 과잉 방지 (항상 마지막으로 밀기)
  const withoutNext: FlowAnchor[] = unique.filter(
    (a): a is FlowAnchor => a !== NEXT
  );

  if (unique.includes(NEXT)) {
    withoutNext.push(NEXT);
  }

  return withoutNext.slice(0, max) as FlowAnchor[];
  }

/* -------------------------------------------------- */
/* Engine (Base + Flow)                                */
/* -------------------------------------------------- */

function baseReason(input: ReasoningInput): Pick<
  ReasoningResult,
  "domain" | "intent" | "userStage" | "confidence"
> {
  const text = norm(input.input);
  const lower = text.toLowerCase();

  // Domain scoring
  const domainScored = scoreByRules(lower, DOMAIN_RULES);
  const domain = pickTop(domainScored.scores, "etc");

  // Intent scoring
  const intentScored = scoreByRules(lower, INTENT_RULES);
  const intent = pickTop(intentScored.scores, "ask");

  // Stage scoring
  const stageScored = scoreByRules(lower, STAGE_RULES);
  const userStage = pickTop(stageScored.scores, "ready");

  // Confidence
const evidenceCount =
  domainScored.evidence.filter(e => e.key !== "etc").length +
  intentScored.evidence.length +
  stageScored.evidence.length;

  const gap = Math.max(
    topGapOf(domainScored.scores),
    topGapOf(intentScored.scores),
    topGapOf(stageScored.scores)
  );

  const confidence = computeConfidence({
    inputLen: text.length,
    evidenceCount,
    topGap: gap,
    stage: userStage,
  });

  return { domain, intent, userStage, confidence };
}

export const ReasoningEngine = {
  reason(input: ReasoningInput): ReasoningResult {

    const text = norm(input.input); // ✅ 🔥 이 줄 복구

        /**
     * 🔥 SSOT: IMAGE GENERATION STABILITY OVERRIDE
     * -------------------------------------------
     * - Decision 단계에서 "생성 의도"가 확정된 경우
     * - Reasoning은 더 이상 추측/분류하지 않는다
     * - confused / refine_input / looping 진입 전부 차단
     */
    if (input.wantsImageGeneration === true) {
      return withDecisionProposal({
        intent: "design",
        userStage: "ready",
        domain: "etc",
        confidence: 0.85,
        cognitiveLoad: "low",
        depthHint: "shallow",
        nextAnchors: ["VISION_PRIMARY"],
        __internal: {
          turnIntent: input.turnIntent ?? "QUESTION",
        },
      }, "wants_image_generation");
    }


        // 🔥 GPT-style ACK_CONTINUE (SSOT)
    // - "응", "오케이", "그래" 등
    // - 새 판단 ❌, 새 질문 ❌
    // - 이전 흐름 유지 + 바로 이어가기
    if (input.turnFlow === "ACK_CONTINUE") {
      return withDecisionProposal({
        intent: "ask",
        userStage: "ready",
        domain: "etc",
        confidence: 0.7,
        cognitiveLoad: "low",
        depthHint: "normal",
        nextAnchors: [], // 🔒 이전 anchors 유지 (중요)
        __internal: {
          turnIntent: input.turnIntent ?? "CONTINUATION",
        },
      }, "ack_continue");
    }
        // 🔥 SSOT: IMAGE INPUT OVERRIDE
    // 이미지가 포함된 입력은 confused / refine_input 루트 진입 금지
    const turnIntent: TurnIntent = input.turnIntent ?? "QUESTION";
    if (input.hasImage === true) {
      return withDecisionProposal({
        intent: "ask",
        userStage: "ready",
        domain: "etc",
        confidence: 0.78,
        cognitiveLoad: "low",
        depthHint: "shallow",
        nextAnchors: ["VISION_PRIMARY"],
        __internal: {
          turnIntent,
        },
      }, "image_input");
    }

        /**
     * 🔒 SSOT: IMAGE INPUT OVERRIDE
     * - 이미지 입력은 '이해 불가(confused)' 상태로 취급하지 않는다
     * - 기본적으로 "설명 가능한 상황"으로 간주한다
     * - Clarify / REFINE_INPUT 진입 차단
     */
    if (text === "[IMAGE_INPUT]") {
      return withDecisionProposal({
        intent: "ask",
        userStage: "ready",
        domain: "etc",
        confidence: 0.78,
        cognitiveLoad: "low",
        depthHint: "shallow",
        nextAnchors: ["VISION_PRIMARY"],
        __internal: { turnIntent },
      }, "image_input_marker");
    }



   // 🔥 DIRECT CHAT OVERRIDE (SSOT)
   // - 짧은 대화형 질문은 설명/설계/정리 대상 아님
   // - GPT/Gemini 스타일 즉답 유도
   if (isDirectChat(text)) {
     return withDecisionProposal({
       intent: "ask",
       userStage: "ready",
       domain: "etc",
       confidence: 0.7, // 🔒 direct chat 안정 상한
       cognitiveLoad: "low",
       depthHint: "shallow",
       nextAnchors: [], // ❗ 절대 REFINE_INPUT 금지
       __internal: { turnIntent },
      }, "direct_chat");
   }

   const base = baseReason(input);

      // 🔥 SSOT FIX: 구어체 실행/안내 요청은 confused 금지
    if (
      base.userStage === "confused" &&
      isCasualActionRequest(text)
    ) {
      return withDecisionProposal({
        ...base,
        userStage: "ready",
        confidence: stabilizeConfidence({
          base: Math.max(base.confidence, 0.6),
          prevStage: input.prevHint?.userStage,
          stage: "ready",
          turnIntent,
        }),
        cognitiveLoad: "low",
        depthHint: "normal",
        nextAnchors: ["NEXT_STEP"],
        __internal: { turnIntent },
      }, "casual_action_request");
    }

    

    // 🔥 SSOT: DESIGN DECLARATION OVERRIDE
  // - 설계/결정 의지가 명확한 문장은 confused 금지
  // - "가자 / 쓰자 / 적용 / 진행" 류는 즉시 READY
  if (
    base.intent === "design" &&
    base.userStage === "confused" &&
    /(가자|쓰자|적용|진행|확정|이걸로|최종)/.test(text)
  ) {
    return withDecisionProposal({
      ...base,
      userStage: "ready",
      confidence: stabilizeConfidence({
        base: Math.max(base.confidence, 0.6),
        prevStage: input.prevHint?.userStage,
        stage: "ready",
        turnIntent,
      }),
      cognitiveLoad: "low",
      depthHint: "normal",
      nextAnchors: ["EXPAND_SCOPE", "NEXT_STEP"],
      __internal: { turnIntent },
    }, "design_commit_phrase");
  }

    // 🔥 GPT-style GENERATIVE FALLBACK (SSOT)
 // - 짧고 모호한 제안 요청은 되묻기 금지
 if (
   base.userStage === "confused" &&
   base.confidence < 0.4 &&
   (base.intent === "design" || base.intent === "decide") &&
   text.length <= 12
 ) {
  const bumped = clamp01(
    Math.min(base.confidence + 0.08, 0.55)
  );
   return withDecisionProposal({
     ...base,
     userStage: "ready",
     confidence: stabilizeConfidence({
        base: bumped,
        prevStage: input.prevHint?.userStage,
        stage: "ready",
        turnIntent,
      }),

     cognitiveLoad: "low",
     depthHint: "normal",
     nextAnchors: ["EXPAND_SCOPE", "NEXT_STEP"],
     __internal: { turnIntent },
   }, "short_ambiguous_design_fallback");
 }

    if (
   turnIntent === "REACTION" ||
   turnIntent === "AGREEMENT"
 ) {
   return withDecisionProposal({
     ...base,
     userStage: "ready",
     // 🔒 과확신 금지: 반응/동의는 '대화 안정'만, confidence 올리기 금지
        confidence: stabilizeConfidence({
          base: base.confidence,
          prevStage: input.prevHint?.userStage,
          stage: "ready",
          turnIntent,
        }),
     cognitiveLoad: "low",
     depthHint: "shallow",
     nextAnchors: [], // ❗ 설명/정리/요약 전부 금지
     __internal: { turnIntent },
   }, "reaction_or_agreement");
 }

   // 🔥 CONTINUATION (FOLLOW-UP QUESTION)
  // - 이전 맥락을 유지한 채 선택지/확장만 요구
  // - 새 주제 전환 ❌
  // - SUMMARY / NEXT_STEP 강제 ❌
  if (turnIntent === "CONTINUATION") {
    return withDecisionProposal({
      ...base,
      // 🔥 SSOT: CONTINUATION은 intent/깊이/앵커를 변경하지 않는다
          // 🔒 GPT-style: continuation은 새 판단을 하지 않는다
    confidence: stabilizeConfidence({
      base: Math.max(base.confidence, 0.55),
      prevStage: input.prevHint?.userStage,
      stage: "ready",
      turnIntent,
    }),
    cognitiveLoad: "low",
    depthHint: "normal",
    nextAnchors: [], // 🔒 anchors 유지 (ContextRuntime에서 carry)
      __internal: { turnIntent },
    }, "continuation");
  }
    
    const cognitiveLoad = estimateCognitiveLoad(text);

    const depthHint = estimateDepthHint(
      base.intent,
      base.userStage,
      base.domain
    );
    
      // ----------------------------------
    // 🔒 SSOT: Capability feature attach
    // - NO decision
    // - NO confidence modification
    // - Scheduler consumption only
    // ----------------------------------

 let codeFeatures:
   import("../capability/code/code-ast-types").CodeASTFeatures
   | undefined;
 let mathFeatures:
   import("../capability/math/math-graph-types").MathGraphFeatures
   | undefined;

    // Code AST: dev domain + code-like text only
    if (base.domain === "dev" && /```|function|class|const|let|var/.test(text)) {
      try {
        codeFeatures = analyzeCodeAST(text).features;
      } catch {
        codeFeatures = undefined;
      }
    }

    // Math graph: symbolic-heavy expressions only
 if (
   /[=+\-*/^()]/.test(text) &&
   !/function|class|=>|{|}/.test(text)
 ) {
      try {
        mathFeatures = analyzeMathGraph(text).features;
      } catch {
        mathFeatures = undefined;
      }
    }

    // 🔥 SSOT PATCH: Cognitive Complexity Deep Upgrade
    // -----------------------------------------------
    // 기존 구조는 failure 기반 승격만 사용
    // 여기서 purely cognitive complexity 기반 deep 승격 추가

let upgradedDepth = depthHint;

const longAnalyticalText = text.length >= 900;

const hasMathGraph = Boolean(mathFeatures);
const hasCodeAST = Boolean(codeFeatures);

if (
  base.userStage === "ready" &&
  (
    cognitiveLoad === "high" ||
    longAnalyticalText ||
    hasMathGraph ||
    hasCodeAST
  )
) {
  upgradedDepth = "deep";
}
    const nextAnchors = inferNextAnchors({
      intent: base.intent,
      stage: base.userStage,
      depth: upgradedDepth,
      domain: base.domain,
    });
    
    const stabilizedAnchors = stabilizeAnchors(nextAnchors);

    const finalAnchors: FlowAnchor[] =
      stabilizedAnchors.length > 0
        ? cognitiveLoad === "high"
          ? stabilizedAnchors.slice(0, 2)
          : stabilizedAnchors
        : ["NEXT_STEP"];

    // 🔒 SSOT FINAL SAFETY
    // - nextAnchors는 절대 비어 있으면 안 된다
    // - CompletionPolicy / ChatEngine 계약 보장
    if (finalAnchors.length === 0) {
      finalAnchors.push("NEXT_STEP");
    }

        console.log("[DEBUG][REASONING_FINAL_PATCHED]", {
  input: text,
  intent: base.intent,
  stage: base.userStage,
  anchors: finalAnchors,
});


    return withDecisionProposal({
      ...base,
      // 🔒 SSOT: confidence는 흐름 안정 지표, '승격' 금지, 감쇠/상한만 적용
      confidence: stabilizeConfidence({
        base: base.confidence,
        prevStage: input.prevHint?.userStage,
        stage: base.userStage,
        turnIntent,
      }),
      cognitiveLoad,
      depthHint: upgradedDepth,
      nextAnchors: finalAnchors,
      codeFeatures,
      mathFeatures,
      __internal: { turnIntent },
    }, "base_reasoning");
  },
};
