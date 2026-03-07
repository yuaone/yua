  // 🔥 YUA Decision Orchestrator — SSOT CORE
  // ---------------------------------------
  // 책임:
  // - 지능 계산의 단일 소유자
  // - Decision / Reasoning / Path / MemoryIntent 확정
  // - ChatEngine은 이 결과를 "컴파일"만 한다
  /**
   * Control Plane Learning System (v4)
   *
   * - Decision is immutable
   * - Learning only shifts thresholds
   * - No rule mutation
   * - No model retraining
   * - All effects observable via RAW_EVENT
   */

  import { runLitePipeline } from "../lite/pipeline-lite";
  import { decidePath } from "../../routes/path-router";
  import { scheduleReasoning } from "../scheduler/reasoning-scheduler";
  import { ReasoningEngine } from "../reasoning/reasoning-engine";
  import type { MemoryIntent } from "../decision/memory-intent.types";
  import { detectMemoryIntent } from "../memory/memory-intent";
  import { judgmentRegistry } from "../judgment/judgment-singletons";
  import { computeResponseAffordance } from "./affordance-calculator";
  import { AffordanceThreadStore } from "./affordance-thread-store";
  import type { ResponseAffordanceVector } from "./response-affordance";
  import { PersonaPermissionEngine } from "../persona/persona-permission-engine";
  import { inferPersonaFromAnchors } from "../persona/persona-inference-engine";
  import { defaultPersonaContext } from "../persona/persona-context.types";
  import { normalizeVerdict } from "../judgment/verdict-adapter";
  import type { JudgmentInput } from "../judgment/judgment-input";
  import type { DecisionContext } from "./decision-context.types";
  import type { Persona } from "../persona/persona-context.types";
  import type { ResponseHint } from "../chat/types/response.final";
  import { writeRawEvent } from "../telemetry/raw-event-writer";
  import { writeFailureSurface } from "../telemetry/failure-surface-writer";
  import type { AttachmentMeta } from "../chat/types/attachment.types";
  import type { TurnFlow } from "../chat/types/turn-flow";
  import type { ThinkingProfile } from "../../types/stream";
  import type {
    ImageAnalysisPlan,
    ImageGenerationPlan,
    SearchVerifyPlan,
    ToolExecutionPlan,
    FileIntelligencePlan,
  } from "../execution/execution-plan";
  import type { SearchPlan } from "../execution/execution-plan";
  import type { ConversationalOutcome } from "./conversational-outcome";
  import { CrossMemorySummarizer } from "../memory/cross/cross-memory.summarizer";
  import { CrossMemoryWriter } from "../memory/cross/cross-memory.writer";
  import { buildToolGateSignals } from "../tools/tool-gate-signal-builder";
  import { routeToolConfidence } from "../tools/confidence-router";
  import { resolveTimeAxis } from "../time/time-axis-resolver";
  import { extractMarketInput } from "../tools/input-extractor";
  import { decideComputePolicy } from "../compute/compute-policy";
  import { FailureSurfaceEngine } from "../selfcheck/failure-surface-engine";
  import type { FailureSurface } from "../selfcheck/failure-surface-engine";
  import { FailureSurfaceAggregator } from "../telemetry/failure-surface-aggregator";
  import { controlPlaneStore } from "../control-plane/control-plane-store";
  import { applyMetaThreshold, applyMetaWeight } from "../control-plane/apply-meta-parameters";
  import { ThreadReasoningContext } from "../reasoning/thread-reasoning-context";
  import { getActiveFileSession } from "../../db/file-session-repository";
  import {
    resolveLearningBias,
  } from "../control-plane/learning-adjustment-bias";
  import { evaluateYuaMaxV0 } from "../flowguard/yua-max-v0";
  import { evaluateYuaMaxV1, getYuaMaxV1LastMeta } from "../flowguard/yua-max-client";
  import type { YuaMaxV1Input } from "yua-shared/types/yuaMax";
  import { hasImageGenerationIntent } from "../image/image-intent-detector";
  import { hasFileAttachments } from "../file-intel/plan/has-file-attachments";
  import { ThreadSemanticStateRepository } from "../semantic/thread-semantic-state-repository";
  import { extractTopicDeterministic } from "../semantic/topic-extractor";
  import { extractEntities } from "../semantic/entity-extractor";
  export interface DecisionOrchestratorInput {
    message: string;
    persona: Persona;
    traceId: string;
    userId?: number;
    threadId?: number;
    instanceId?: string;
    workspaceId: string; // ✅ SSOT 추가
    attachments?: AttachmentMeta[];
    requestedThinkingProfile?: ThinkingProfile;
    forceThinking?: boolean;
  fileRagConfidence?: number;
  deepVariant?: "STANDARD" | "EXPANDED";
  }

  type VerifierVerdict = "PASS" | "WEAK" | "FAIL";

  async function withTimeout<T>(
    p: Promise<T>,
    ms: number
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error("TIMEOUT"));
      }, ms);
    });
    try {
      return await Promise.race([p, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function clamp01(v: number): number {
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
  }

  export const DecisionOrchestrator = {
    async run(
      input: DecisionOrchestratorInput
    ): Promise<DecisionContext> {
      const {
        message,
        persona,
        traceId,
        userId,
        threadId,
        workspaceId,
        attachments,
        requestedThinkingProfile,
      } = input;

      const instanceId = workspaceId;


      /* ----------------------------------
        1️⃣ Lite Pipeline (sanitize only)
      ---------------------------------- */
      const lite = await runLitePipeline(message);

      if ((lite as any).engineInput) {
    console.error("[SSOT_VIOLATION] engineInput 사용 시도 감지", {
      traceId,
    });
  }
  const hasText =
    typeof message === "string" && message.trim().length > 0;

  const hasImage =
    Array.isArray(attachments) &&
    attachments.some(a => a.kind === "image");

  console.log("[FILE_DEBUG][DECISION]", {
    attachmentsReceived: attachments,
    attachmentKinds: Array.isArray(attachments)
      ? attachments.map(a => a.kind)
      : undefined,
    hasFileComputed: Array.isArray(attachments)
      ? attachments.some(a => a.kind === "file")
      : false,
  });

  let activeFileSession = null;

  if (threadId) {
    try {
      activeFileSession = await getActiveFileSession(threadId);
    } catch (e) {
      console.error("[FILE_SESSION_FETCH_ERROR]", {
        traceId,
        error: String(e),
      });
    }
  }

  const hasFile =
    (Array.isArray(attachments) &&
      attachments.some(a => a.kind === "file")) ||
    !!activeFileSession;

  const fileAttachments =
    Array.isArray(attachments)
      ? attachments.filter(a => a.kind === "file")
      : [];

  const hasFileAttachmentInput =
    hasFileAttachments(fileAttachments as any);


  // 🔒 SSOT: IMAGE ONLY → [IMAGE_INPUT]
  const sanitizedMessage =
    hasImage && !hasText
      ? "[IMAGE_INPUT]"
      : message;

  const hasFileIntent =
    /(file|csv|excel|sheet|table|column|page|zip|첨부|파일)/i.test(
      sanitizedMessage
    );

  const fileRelevanceScore =
    hasFile && hasFileIntent
      ? 1
      : hasFile
      ? 0.3
      : 0;


    /**
   * 🔒 SSOT: TEXT→IMAGE 생성 의도 (Decision 전용)
   * - strict verb-gated + command-only detector
   * - noun-only / 설명/질문형은 모두 차단
   */
  const wantsImageGeneration =
    hasText &&
    !hasImage &&
    hasImageGenerationIntent(sanitizedMessage);

  const turnFlow = detectTurnFlow({
    message: sanitizedMessage,
    threadId,
    hasImage,
  });

  
  // 🔒 SSOT: 언어 중립적 Question Signal (Reasoning 이전)
  // - PromptBuilder ONLY 소비
  // - Reasoning / Intent 의존 ❌
  const hasQuestionSignal =
    sanitizedMessage.trim().endsWith("?") ||
    /(왜|어떻게|무엇|뭐|어떤|가능|방법)/.test(sanitizedMessage) ||
    /(why|how|what|which|who|when|where|can|could)/i.test(sanitizedMessage);

      const language = detectLanguage(sanitizedMessage);

  function hasNewInformation(params: {
    message: string;
    prevAnchors?: unknown[];
  }): boolean {
    const { message, prevAnchors } = params;

    // 이전 anchor가 없으면 새 정보로 간주
    if (!prevAnchors || prevAnchors.length === 0) return true;

    // 메시지가 너무 짧으면 새 정보 없음
    if (message.trim().length <= 30) return false;

    // 새로운 숫자/조건/명시적 선언
    if (/\d+|\bif\b|\bwhen\b|\b조건\b|\b경우\b/i.test(message)) {
      return true;
    }

    return false;
  }

  function isSameTopicDifferentFacet(params: {
    message: string;
    prevAnchors?: unknown[];
  }): boolean {
    const { message, prevAnchors } = params;

    if (!prevAnchors || prevAnchors.length === 0) return false;

    // 비교 / 장단점 / 보완 설명 요청 (언어 최소)
    if (/(장점|단점|비교|차이|pros|cons|advantages|drawbacks)/i.test(message)) {
      return true;
    }

    // WHY / HOW 계열은 목적 전환이 아니라 facet 확장
    if (/(why|how|왜|어떻게)/i.test(message)) {
      return true;
    }

    return false;
  }



      function isHardTopicShift(message: string): boolean {
        const m = message.trim();
  // 명시적 전환 선언만 허용
  if (/^(전혀 다른 주제|다른 주제로|별개로 이야기하면)/.test(m)) {
    return true;
  }

    // 질문 자체가 독립 완결형
    if (
    message.length > 20 &&
    /(전혀 다른|다른 주제|새로|별개로)/.test(message)
  ) {
    return true;
  }

    return false;
  }

  function detectLanguage(text: string): "ko" | "en" | "unknown" {
    const hasKorean = /[가-힣]/.test(text);
    const hasEnglish = /[a-zA-Z]/.test(text);

    // 🔒 SSOT: mixed → ko (사용자 언어 주권)
    if (hasKorean) return "ko";
    if (hasEnglish) return "en";
    return "unknown";
  }

  function detectTurnFlow(params: {
    message: string;
    threadId?: number;
    hasImage: boolean;
  }): TurnFlow {
    const { message, threadId, hasImage } = params;
    const m = message.trim();

    // 새 대화 or 이미지 입력
    if (!threadId || hasImage) return "NEW";

    // 짧은 동의 / 추임새
    if (/^(응|ㅇㅇ|그래|좋아|알겠|오케이|ok|okay|그럼)$/i.test(m)) {
      return "ACK_CONTINUE";
    }

    // 명시적 주제 전환
  if (/^(전혀 다른|다른 주제|별개로)/.test(m)) {
    return "TOPIC_SHIFT";
  }

    // 🔥 SSOT: 짧은 질문도 FOLLOW_UP으로 분류 (같은 thread 맥락 유지)
    // - "왜", "어떻게", "뭐", "언제", "얼마" 등은 ? 없이도 follow-up로 간주
    const looksLikeShortFollowUp =
      m.length <= 18 &&
      (
        m.endsWith("?") ||
        /^(왜|어떻게|뭐|무엇|언제|어디|얼마|누가|which|what|why|how|when|where|who|how\s+much)\??$/i.test(m)
      );
    if (looksLikeShortFollowUp) return "FOLLOW_UP";

    return "NEW";
  }

  function isExplicitContinuation(message: string): boolean {
    const m = message.trim().replace(/\s+/g, "");

    // 1️⃣ 번호 / 순번
    if (/^\d+(번)?$/.test(m)) return true;
    if (/^(첫|두|세|네|다섯)번째$/.test(m)) return true;

    // 2️⃣ 번호 + 지시 동사
    if (/^\d+(번)?(줘|가자|해|부터|로)$/.test(m)) return true;

    // 3️⃣ 지시형 단답
    if (/^(이걸로|그걸로|저걸로|그거|이거|위에거|아래거)$/.test(m))
      return true;

    // 4️⃣ 진행 트리거
    if (/^(계속|다음|그다음|이어서|진행|시작)$/.test(m))
      return true;

    return false;
  }

  function isAcknowledgement(text: string): boolean {
    return /^(응|ㅇㅇ|그래|좋아|알겠|오케이|ok|okay)$/i.test(
      text.replace(/\s/g, "")
    );
  }
  function isSoftContinuation(message: string): boolean {
    const m = message.trim();

    // ❌ 길이 기준 CONTINUATION 완전 제거 (SSOT ROLLBACK)

    // 🔒 아주 짧은 추임새만 허용
    if (isAcknowledgement(m) && m.length <= 10) {
      return true;
    }

    // 🔒 단독 연결어 + 내용 없음만 허용
    if (
      /^(그럼|그래서|그러면|근데|그런데|그래)$/.test(m)
    ) {
      return true;
    }

  // ✅ SSOT: "짧은 질문"도 같은 맥락이면 CONTINUATION 후보로 인정
    // - Follow-up 질문(짧은 WHY/HOW/WHAT/WHEN...)을 continuation signal로 살림
    // - 단, '새 작업/구현/생성'류 명령은 continuation 아님(아래에서 차단)
    if (
      m.length <= 18 &&
      (
        m.endsWith("?") ||
        /^(왜|어떻게|뭐|무엇|언제|어디|얼마|누가|which|what|why|how|when|where|who|how\s+much)\??$/i.test(m)
      )
    ) {
      return true;
    }

    // 🔥 행동/생성/요청 동사 포함 시 무조건 QUESTION
    if (/(만들어|작성|구현|생성|코드|짜줘|리팩토링|설계)/i.test(m)) {
      return false;
    }

    // 🔒 물음표만으로 continuation 판단 금지
    return false;
  }

  
  
  let turnIntent: "QUESTION" | "CONTINUATION" | "SHIFT";

  if (hasImage) {
    turnIntent = "QUESTION";
  } else if (threadId == null) {
    turnIntent = "QUESTION";
  } else if (isExplicitContinuation(sanitizedMessage)) {
    turnIntent = "CONTINUATION";
  } else if (
    turnFlow === "TOPIC_SHIFT" &&
    isHardTopicShift(sanitizedMessage)
  ) {
    turnIntent = "SHIFT";
  } else if (
    turnFlow === "ACK_CONTINUE" ||
    (turnFlow === "FOLLOW_UP" && isSoftContinuation(sanitizedMessage))
  ) {
    turnIntent = "CONTINUATION";
  } else {
    turnIntent = "QUESTION";
  }

  // 🔥 SSOT: Transform / Summary requests are QUESTIONS
  if (/(정리|요약|간단히|핵심만|정돈)/.test(sanitizedMessage)) {
    turnIntent = "QUESTION";
  }
    /* ✅ 여기 바로 아래 */
  console.log("[TURN_INTENT_TEST]", {
    messageLength: sanitizedMessage?.length ?? 0,
    turnIntent,
    language,
    hardShift: isHardTopicShift(sanitizedMessage),
    softContinuation: isSoftContinuation(sanitizedMessage),
  });

  // 🔥 SSOT: Conditional Auto File Retrieval (A-lite)
  const forceFileRetrievalOnce =
    hasFile &&
    turnIntent === "QUESTION" &&
    turnFlow !== "TOPIC_SHIFT" &&
    hasText === true;


      const isCodeLikeInput =
        /```|import\s+|export\s+|function\s+|class\s+|const\s+|YOU ARE A SENIOR/i.test(
          sanitizedMessage
        );

      // 🔒 SSOT: SEARCH 허용은 "명시적 동사"가 있을 때만
      // - "가격?" 같은 명사 단독은 SEARCH 금지 유지
      // - "가격 알려줘/확인해줘/조회해줘/찾아줘" 같은 동사 포함만 허용
      const hasExplicitSearchVerb =
        /(검색|search|찾아|찾아봐|조사|알아봐|look\s*up|lookup|find|check)/i.test(
          sanitizedMessage
        );
      /**
       * 🔒 SSOT: SEARCH CONTRACT (Deterministic)
       * - 긴 프롬프트 오탐 방지
       * - 계약 키워드 / 명령형 anchored 패턴만 허용
       */
      function hasSearchContract(message: string): boolean {
        const m = message.trim();

        // 1️⃣ Contract Markers (절대 우선)
        if (/\[SEARCH\]|\[WEB_SEARCH\]|#search_contract|⟦SEARCH⟧/i.test(m)) {
          return true;
        }

        // 2️⃣ Anchored command-style patterns (다국어)
        const patterns = [
          // Korean
          /(검색(하(고)?와|해와|해서\s*알려|해줘)|찾아(서)?\s*(보고해|알려줘))/,

          // English
          /\b(search|look\s*up|find)\b.*\b(report|for\s*me|and\s*tell|and\s*come\s*back)/i,

          // Japanese
          /(検索して(きて|報告して))/,

          // Chinese
          /(搜索.*(回来|报告))/,

          // Spanish
          /(busca(r)?\s+y\s+(informa|dime))/i,

          // French
          /(cherche(r)?\s+et\s+(rapporte|dis-moi))/i,
        ];

        return patterns.some(p => p.test(m));
      }

      const forceSearchByContract = hasSearchContract(sanitizedMessage);
      const hasExplicitRequestVerb =
        /(알려|말해|확인|조회|찾아|조사|정리해|요약해|보여|tell\s+me|show\s+me|give\s+me)/i.test(
          sanitizedMessage
        );

      const hasFactSignal =
        /(언제|어디|얼마|누가|통계|현황|가격|최신|what|when|where|who|how\s+much|latest|price)/i.test(
          sanitizedMessage
        );

      // ✅ 최종: SEARCH path 허용 조건
 const allowSearchByIntent =
   forceSearchByContract ||
   (
     !forceSearchByContract &&
     (
       hasExplicitSearchVerb ||
       (hasExplicitRequestVerb && hasFactSignal)
     )
   );
// 🔥 SSOT: 존재 여부 질문은 자동 SEARCH 승격
const isExistenceQuestion =
  /(존재|있어|있나요|있습니까|exists|is there|does .* exist)/i.test(
    sanitizedMessage
  );
      /* ----------------------------------
        2️⃣ Reasoning (단 1회, proposal-first)
      ---------------------------------- */
  const reasoning = ReasoningEngine.reason({
    input: sanitizedMessage,
    turnFlow,
    turnIntent,
    hasImage, // 🔥 반드시 전달
    wantsImageGeneration, // 🔥 NEW: TEXT→IMAGE 안정화 신호
    prevHint: hasImage
      ? { userStage: "ready" } // 🔒 confused 진입 차단
      : undefined,
  });

      const finalReasoning = Object.freeze({ ...reasoning });
// 🔒 SSOT: TEXT→IMAGE side-effect guard (Reasoning 이후 계산)
const imageIntentAllowed =
  wantsImageGeneration === true &&
  turnIntent === "QUESTION" &&
  finalReasoning.intent === "ask" &&        // 🔥 design 금지보다 더 강함
  finalReasoning.userStage === "ready" &&  // 🔥 실행 명령일 때만
  sanitizedMessage.length < 800 &&         // 🔥 강력 제한
  !/```/.test(sanitizedMessage) &&
  !isCodeLikeInput;                        // 🔥 코드 프롬프트 차단
  
      const proposal = finalReasoning.decisionProposal!;
      let path = proposal.path;
      let mode = proposal.mode;
      let confidence = clamp01(proposal.confidence);

  const isStrategicQuestion =
    finalReasoning.intent === "design" ||
    finalReasoning.intent === "decide" ||
    /(보완|전략|방향|맞겠|의견|생각)/i.test(sanitizedMessage);

 if (forceSearchByContract) {
   path = "SEARCH";
   confidence = Math.max(confidence, 0.9);
 } else if (allowSearchByIntent && !isStrategicQuestion) {
   path = "SEARCH";
 }

      /* ----------------------------------
        2-1️⃣ Path Policy (soft only)
      ---------------------------------- */
      const basePath = decidePath({
        content: sanitizedMessage,
        source: "USER",
        traceId,
        receivedAt: Date.now(),
      });

      const schedule = scheduleReasoning({
        basePath,
      });

      const pathRank: Record<string, number> = {
        FAST: 0,
        NORMAL: 1,
        SEARCH: 2,
        DEEP: 3,
        BENCH: 4,
        RESEARCH: 5,
      };

      const proposalRank = pathRank[path] ?? 1;
      const scheduleRank = pathRank[schedule.finalPath] ?? 1;
      if (scheduleRank > proposalRank) {
        confidence *= 0.9;
      }

      // SEARCH 정책/의도 충돌은 confidence 조정만 수행
 if (schedule.finalPath === "SEARCH" && !allowSearchByIntent && !forceSearchByContract) {
   confidence *= 0.88;
 }

      if (schedule.finalPath === "NORMAL" && allowSearchByIntent) {
        confidence *= 0.95;
      }

  const fileRagConfidence =
    typeof input.fileRagConfidence === "number"
      ? input.fileRagConfidence
      : undefined;

      if (fileRagConfidence != null && fileRagConfidence < 0.55) {
        confidence *= 0.92;
      }

      let carriedAnchors: typeof finalReasoning.nextAnchors | undefined;
      if (
        threadId != null &&
        finalReasoning.nextAnchors.length === 0
      ) {
        try {
          const recent =
            await ThreadReasoningContext.getRecent(threadId, 1);
          carriedAnchors = recent?.[0]?.anchors as
            | typeof finalReasoning.nextAnchors
            | undefined;
        } catch {
          // best-effort
        }
      }

      const effectiveAnchors =
        finalReasoning.nextAnchors.length > 0
          ? finalReasoning.nextAnchors
          : carriedAnchors && carriedAnchors.length > 0
          ? carriedAnchors
          : ["NEXT_STEP"];

  let prevResponseAffordance: ResponseAffordanceVector | undefined;
  let prevToneBias:
    | DecisionContext["toneBias"]
    | undefined;

if (threadId != null && workspaceId) {
  const prev = await AffordanceThreadStore.get(
    workspaceId,
    threadId
  );
        prevResponseAffordance = prev?.affordance;
        prevToneBias = prev?.toneBias;

        console.log("[AFFORDANCE][PREV_LOAD]", {
          threadId,
          hasPrev: !!prevResponseAffordance,
          prevResponseAffordance,
        });
      }

          /* ----------------------------------
        🔥 IMAGE ANALYSIS EXECUTION PLAN (SSOT)
        - 이미지 입력 시 Decision 단계에서만 생성
        - 분석 + 생성 의도 분리
      ---------------------------------- */

  let executionPlan:
    | ImageAnalysisPlan
    | ImageGenerationPlan
    | SearchPlan
    | SearchVerifyPlan
    | ToolExecutionPlan
    | FileIntelligencePlan
    | undefined = undefined;

  /* ----------------------------------
    📂 FILE ANALYSIS PLAN (SSOT)
    - 파일 첨부 + 분석 요청 시 TOOL로 라우팅
  ---------------------------------- */


  if (
    !executionPlan &&
    hasFileAttachmentInput &&
    hasFileIntent
  ) {
    executionPlan = {
      task: "FILE_INTELLIGENCE",
      confidence: finalReasoning.confidence,
      payload: {
        message: sanitizedMessage,
        attachments: fileAttachments,
      },
    };
  }

  if (!executionPlan && hasFile) {
    executionPlan = {
      task: "FILE_ANALYSIS",
      confidence: finalReasoning.confidence,
      payload: {
        message: sanitizedMessage,
        attachments: attachments ?? [],
        sessionSummary: activeFileSession?.summary_json ?? null,
      },
    };
  }

  /* ----------------------------------
    🖼️ IMAGE ANALYSIS PLAN (FIXED SSOT)
    - 이미지 입력은 기본적으로 "분석"
    - 변환/생성 의도가 있을 때만 GENERATE_ASSET
  ---------------------------------- */

  if (hasImage && !wantsImageGeneration) {
    const wantsTransform =
      /(그려|바꿔|변환|리터치|스타일|합성|꾸며|보정)/i.test(sanitizedMessage);

    if (!hasFile) executionPlan = {
      task: "IMAGE_ANALYSIS",
      confidence: finalReasoning.confidence,
      payload: {
        observation: {
          message: sanitizedMessage,
          attachments,
        },
        nextAction: wantsTransform ? "GENERATE_ASSET" : undefined,
        uxHint: "ANALYZING_IMAGE",
      },
    } satisfies ImageAnalysisPlan;
  }


      /**
    * 🔒 SSOT: TEXT→IMAGE는 IMAGE_GENERATION로만 선언
    * - attachments 기반 IMAGE_ANALYSIS 흐름과 분리
    * - 명시적 생성 의도(verb+imperative)에서만 승격
    */
if (imageIntentAllowed === true) {
  if (!hasFile) executionPlan = {
          task: "IMAGE_GENERATION",
          confidence: finalReasoning.confidence,
          payload: {
            message: sanitizedMessage,
          },
        } satisfies ImageGenerationPlan;
      }
  /* ----------------------------------
    🔎 SEARCH PLAN (SSOT)
    - unified search via SearchTriggerScore (set later)
  ---------------------------------- */

          /* ----------------------------------
        🔒 SSOT: Decision 헌법 v1 — Path Hard Fix
        - IMAGE_INPUT + ready → SEARCH 금지
        - ask + ready → NORMAL 고정
      ---------------------------------- */
      // 🔒 path override 제거: policy mismatch는 confidence penalty만 적용
      if (
        finalReasoning.intent === "ask" &&
        finalReasoning.userStage === "ready" &&
        !allowSearchByIntent
      ) {
        confidence *= 0.92;
      }

      if (hasImage && finalReasoning.userStage === "ready") {
        confidence *= 0.9;
      }

        /**
       * 🔒 SSOT: TEXT→IMAGE 생성도 SEARCH로 보내지 않는다.
       * - 생성은 side-effect 파이프라인이 처리
       * - 검색/검증은 별도 사용자 명시 요청만
       */
      if (wantsImageGeneration) {
        confidence *= 0.9;
      }

      const confidenceFloorApplied = clamp01(confidence);

          // 🔒 SSOT FIX: 설계/진행 트리거는 FAST 금지
      if (
        finalReasoning.intent === "design" &&
        /^(응|그래|좋아).*(시작|진행|가자|해보자)/.test(sanitizedMessage)
      ) {
        confidence *= 0.93;
      }

  // 🔒 SSOT: Declarative promotion result (optional)
  let promotedIntent: "decide" | undefined;
  let promotedConfidence: number | undefined;

 // 🔥 GRAPH CORE: preload semantic state (single fetch)
 let prevSemanticState = null;

 if (threadId != null) {
   try {
     prevSemanticState =
       await ThreadSemanticStateRepository.get(threadId);
   } catch {
     // best-effort
   }
 }

 // 🔥 GRAPH CORE: topic extraction (single calculation)
 const topicResult = extractTopicDeterministic({
   message: sanitizedMessage,
   previousTopic: prevSemanticState?.activeTopic ?? null,
 });

 // 🔥 Continuation Signals (SSOT v1)
 const topicMatch =
   !!prevSemanticState &&
   topicResult.topicKey === prevSemanticState.activeTopic
     ? 1
     : 0;

 const referentialSignal =
   !!prevSemanticState &&
   turnIntent === "QUESTION" &&
   (
     // Korean
     /(또|다른|추가|하나\s*더|그거\s*말고|이거\s*말고|위에\s*거|아까\s*거|비슷한|그럼\s*다른|다른\s*것)/.test(sanitizedMessage)
     ||
     // English
     /(another|one\s*more|more\s*like|something\s*else|instead|other\s+one|similar|else|that\s+one)/i.test(sanitizedMessage)
   )
     ? 1
     : 0;

 const driftSignal =
   !!prevSemanticState &&
   topicResult.topicKey !== prevSemanticState.activeTopic
     ? 1
     : 0;

  // 🔒 SSOT: Base Anchor Confidence (Reasoning 기반)
 const anchorConfidence =
   finalReasoning.nextAnchors &&
   finalReasoning.nextAnchors.length > 0
     ? Math.min(1, finalReasoning.confidence + 0.15)
     : Math.max(0, finalReasoning.confidence - 0.2);

    // 🔥 ENTITY OVERLAP BONUS
let entityOverlapRatio = 0;

 const prevEntities = prevSemanticState?.entityStack ?? [];

 if (prevEntities.length > 0) {
   const currentEntities = extractEntities(sanitizedMessage);

   const overlapCount = currentEntities.filter(e =>
     prevEntities.includes(e)
   ).length;

   const denom = Math.max(
     1,
     Math.min(4, prevEntities.length, currentEntities.length)
   );
   entityOverlapRatio = clamp01(overlapCount / denom);
 }

 // 🔥 Continuation Score (SSOT v1)
 // - single scalar 0~1
 // - includes conditional drift decay + boost cap
 const boostRaw =
   0.28 * topicMatch +
   0.22 * entityOverlapRatio +
   0.22 * referentialSignal;
  // 🔥 Stage 2: meta injection
const metaParams = controlPlaneStore.snapshot();


const boostCapBase = 0.48;
const boostCap = applyMetaWeight(
  boostCapBase,
  metaParams,
  "BOOST_CAP"
);
const boostCapped = Math.min(boostCap, boostRaw);


 const support =
   0.6 * topicMatch +
   0.4 * Math.max(entityOverlapRatio, referentialSignal);

const driftWeightBaseRaw =
  turnIntent === "SHIFT" ? 0.34 : 0.26;

const driftWeight = applyMetaWeight(
  driftWeightBaseRaw,
  metaParams,
  "DRIFT_WEIGHT"
);
 const effectiveDrift =
   driftSignal === 1
     ? (support >= 0.55 ? 0.35 : 1.0)
     : 0;

const continuationBiasBase = 0.25;
const continuationBias = applyMetaWeight(
  continuationBiasBase,
  metaParams,
  "CONTINUATION_WEIGHT"
);

const continuationScore = clamp01(
  continuationBias +
    boostCapped -
    driftWeight * effectiveDrift
);

 // 🔥 SSOT: Continuation refinement (Score-based promotion)
 // - QUESTION이라도 score가 충분하면 CONTINUATION으로 승격
 // - SHIFT는 승격 금지
const metaThresholds = metaParams.filter(
  p => p.target === "THRESHOLD"
);

const continuationThreshold =
  applyMetaThreshold(0.62, metaThresholds);

 const shouldPromoteToContinuation =
   turnIntent === "QUESTION" &&
   turnFlow !== "TOPIC_SHIFT" &&
   !hasImage &&
   continuationScore >= continuationThreshold;

 const effectiveTurnIntent: "QUESTION" | "CONTINUATION" | "SHIFT" =
   turnIntent === "SHIFT"
     ? "SHIFT"
     : shouldPromoteToContinuation
     ? "CONTINUATION"
     : turnIntent;

 // 🔒 Compatibility: keep adjustedAnchorConfidence as the same SSOT scalar (for now)
 const adjustedAnchorConfidence = clamp01(
   0.55 * anchorConfidence + 0.45 * continuationScore
 );
          /* ----------------------------------
        🔒 SSOT: ConversationalOutcome (Single decision)
        - Decision에서 단 1회 결정
        - 아래 신호를 ChatEngine/Prompt/Suggestion이 번역해 소비
      ---------------------------------- */
   const isHardContinuation =
   effectiveTurnIntent === "CONTINUATION" &&
   continuationScore >= continuationThreshold;

      const conversationalOutcome: ConversationalOutcome = (() => {
        // 이미지 입력은 기본적으로 “완결형 + 최소 안내”
        if (hasImage) return "CLOSE";

 if (isHardContinuation) {
   return "CONTINUE_HARD";
 }

  // 🔒 SSOT: design 질문은 기본적으로 열린 상태 유지
  // 단, 명시적 수렴 요청만 CLOSE 허용
  const isExplicitConclude =
    /(확정|최종|결론|이걸로|추천 하나|정해줘)/.test(
      sanitizedMessage
    );

  if (
    turnIntent === "QUESTION" &&
    finalReasoning.intent === "design" &&
    isExplicitConclude
  ) {
    return "CLOSE";
  }

        // 🔓 SSOT: design 질문은 기본적으로 열린 사고 유지
        if (
          adjustedAnchorConfidence >= 0.35 &&
          finalReasoning.intent === "design"
        ) {
          return "CONTINUE_HARD";
        }

        if (continuationScore >= 0.38) {
    return "CONTINUE_SOFT";
  }

        // 준비 완료 + 자신감 높음 → 마무리
        if (
          turnIntent === "QUESTION" &&
          finalReasoning.userStage === "ready" &&
          confidenceFloorApplied >= 0.75
        ) {
          return "CLOSE";
        }

        return "CLOSE";
      })();

  console.log("[DEBUG][REASONING_FINAL]", {
    inputLength: sanitizedMessage?.length ?? 0,
    intent: reasoning.intent,
    stage: reasoning.userStage,
    confidence: reasoning.confidence,
    depth: reasoning.depthHint,
    load: reasoning.cognitiveLoad,
    turnIntent,
    topicMatch,
    entityOverlapRatio,
    referentialSignal,
    driftSignal,
    continuationScore,
    conversationalOutcome,
  });

  const allowContinuation =
    conversationalOutcome === "CONTINUE_HARD" ||
    conversationalOutcome === "CONTINUE_SOFT";
// 🔒 SSOT: confidence freeze before reasoning delta
const confidenceAfterPolicy = clamp01(confidence);

  /* ----------------------------------
     🔒 SSOT: Reasoning Delta (Decision Layer)
     - deterministic only
     - no narration
  ---------------------------------- */
const reasoningPanels: DecisionContext["reasoningPanels"] = [];

 const decisionPanelId = `${traceId}:decision`;

 reasoningPanels.push({
   id: decisionPanelId,
   source: "decision",
   title: "Understanding Your Request",
   index: 0,
   status: "DONE",
   items: [
     {
       id: `${decisionPanelId}:intent`,
       title: "Intent Analysis",
       body: `Detected intent: ${finalReasoning.intent} (confidence ${confidenceAfterPolicy.toFixed(2)})`,
       ts: Date.now(),
     },
     {
       id: `${decisionPanelId}:anchors`,
       title: "Conversation Direction",
       body: (finalReasoning.nextAnchors ?? []).join(", "),
       ts: Date.now(),
     },
   ],
 });

      /* ----------------------------------
        🕒 Time Axis Resolution (SSOT)
        - 서버 시간 기준
        - Decision 단에서만 계산
      ---------------------------------- */

      const marketInput = extractMarketInput(sanitizedMessage);

      const timeAxis = resolveTimeAxis({
        serverNow: new Date(),
        dateHint: marketInput?.dateHint,
      });

      console.log("[TIME_AXIS]", {
        traceId,
        timeAxis,
      });

 
      /* ----------------------------------
        🔧 TOOL GATE (SSOT)
        - Decision에서 "신호 + 허용 여부"만 판단
        - 실행 / 계획 생성 ❌
      ---------------------------------- */

      let toolGate: any | undefined = undefined;

      try {

  // 1️⃣ base signal 생성 (순수)
  const toolGateSignalsBase = buildToolGateSignals({
    inputContext: {
    decisionDomain:
      hasFile
        ? "DOCUMENT"
        : /(가격|주가|시가|종가|매출|실적|지표|통계|얼마|수익)/.test(sanitizedMessage)
        ? "MARKET"
        : "CHAT",
      suggestedPath: path,
      hasSensitiveKeyword: false,
      hasCodeBlock: false,
      contentLength: sanitizedMessage.length,
      metadata: {
        hasImage,
        hasText,
        hasFile,
        isMultimodal: hasImage || !hasText,
        language,
        turnIntent,
      },
    },
    content: sanitizedMessage,
    anchorConfidence: adjustedAnchorConfidence,
    executionTask: executionPlan?.task,
  });

  // 2️⃣ 참조 병합 (Decision 사실만 덧붙임)
  const toolGateSignals = {
    ...toolGateSignalsBase,
    timeAxis, // ✅ Decision에서 계산된 사실
  };
 // 🔥 MARKET + FUTURE implicit SEARCH 승격
 if (
   toolGateSignals.hasMarketIntent &&
   timeAxis?.relation === "FUTURE"
 ) {
   toolGateSignals.hasSearchIntent = true;
 }
  // 🔥 SSOT FIX: 반드시 confidence router 실행
  toolGate = routeToolConfidence({
    ...toolGateSignals,
    traceId,
  });
  
    console.log("[TOOL_GATE][SIGNALS]", {
          traceId,
          signals: toolGateSignals,
        });

 if (toolGate) {
   const toolPanelId = `${traceId}:tool_gate`;

   reasoningPanels.push({
     id: toolPanelId,
     source: "tool_gate",
     title: "Tool Evaluation",
     index: 1,
     status: "DONE",
     items: [
       {
         id: `${toolPanelId}:level`,
         title: "Tool Level",
         body: toolGate.toolLevel ?? "NONE",
         ts: Date.now(),
       },
       {
         id: `${toolPanelId}:reason`,
         title: "Decision Rationale",
         body: toolGate.reason ?? "No tool required",
         ts: Date.now(),
       },
     ],
   });
 }
        console.log("[TOOL_GATE][DECISION]", {
          traceId,
          toolLevel: toolGate.toolLevel,
          allowedTools: toolGate.allowedTools,
          verifierBudget: toolGate.verifierBudget,
          reason: toolGate.reason,
        });
// 🔒 SSOT: ToolGate Veto for side-effect tasks
if (
  executionPlan?.task === "IMAGE_GENERATION" &&
  toolGate?.toolLevel !== "FULL"
) {
  console.warn("[TOOL_GATE][VETO_IMAGE_GENERATION]", {
    traceId,
    toolLevel: toolGate?.toolLevel,
  });
  executionPlan = undefined;
}
      } catch (err) {
        console.error("[TOOL_GATE][ERROR]", {
          traceId,
          error: String(err),
        });
      }
      // Proposal-first: mode remains sourced from reasoning.decisionProposal

      /* ----------------------------------
        3.5️⃣ Response Density Hint (NON-BINDING)
        - 말의 밀도에 대한 참고 신호
        - Decision은 "권고"만 한다
      ---------------------------------- */

      let responseHint: ResponseHint | undefined;

          let outputTransformHint:
        | "CONCLUDE"
        | "SOFT_EXPAND"
        | undefined;


  const relaxOutputConstraints =
    finalReasoning.intent === "design" ||
    finalReasoning.depthHint === "deep";

      if (turnIntent === "QUESTION") {
        responseHint = {
          structure: (() => {
            if (/(vs|차이|비교|장단점|어느|뭐가 더)/i.test(sanitizedMessage)) {
              return "comparison_then_conclusion";
            }
            if (/(어떻게|방법|단계|절차|순서)/i.test(sanitizedMessage)) {
              return "stepwise_explanation";
            }
            if (/(문제|에러|오류|안 돼|실패).*(해결|원인|방법)/i.test(sanitizedMessage)) {
              return "problem_solution";
            }
            return "direct_answer";
          })(),
          forbid: relaxOutputConstraints
            ? {
                metaComment: true,
              }
            : mode === "DEEP"
            ? {
                reasoning: true,
                metaComment: true,
                // 🔥 DEEP에서는 narration 허용
              }
            : {
                reasoning: true,
                metaComment: true,
                narration: true,
              },
        };
  if (
    finalReasoning.intent !== "design" &&
    finalReasoning.userStage === "ready" &&
    confidenceFloorApplied >= 0.75 &&
    !relaxOutputConstraints
  ) {
    outputTransformHint = "CONCLUDE";
  }
        
      } else if (isHardContinuation) {
        responseHint = {
          expansion: /(방법|어떻게|없을까|가능|왜|차이|대안|옵션)/.test(
            sanitizedMessage
          )
            ? "soft"
            : "none",
          forbid: relaxOutputConstraints
            ? {
                metaComment: true,
              }
            : {
                reasoning: true,
                metaComment: true,
                narration: true,
              },
        };
        if (!relaxOutputConstraints) {
          outputTransformHint = "SOFT_EXPAND";
        }
      }

  const responseAffordance: ResponseAffordanceVector =
    computeResponseAffordance({
      reasoning: finalReasoning,
      turnIntent: effectiveTurnIntent,
      anchorConfidence: adjustedAnchorConfidence,
 continuityAllowed:
   effectiveTurnIntent === "CONTINUATION"
     ? continuationScore >= continuationThreshold * 0.65
     : true,
      prevAffordance: prevResponseAffordance,
    });

  console.log("[AFFORDANCE][COMPUTED]", {
    threadId,
    responseAffordance,
  });

  // prevToneBias already resolved above (SSOT)
      // 🎨 TONE BIAS RESOLUTION (SSOT)
  let toneBias: DecisionContext["toneBias"] | undefined;

  // ✅ ADD THIS
  let toneAllowed:
    | {
        personal: boolean;
        source: "persona_permission";
      }
    | undefined;

  if (effectiveTurnIntent === "CONTINUATION" && prevToneBias) {
    toneBias = {
      ...prevToneBias,
      source: "CARRY",
      locked: true,
    };
  } else if (
    effectiveTurnIntent === "QUESTION" &&
    adjustedAnchorConfidence >= 0.6 &&
    prevToneBias
  ) {
    toneBias = {
      ...prevToneBias,
      source: "CARRY",
      locked: false,
    };
  } else {
    toneBias = {
      profile:
        finalReasoning.intent === "design"
          ? "DESIGNER"
          : (promotedIntent ?? finalReasoning.intent) === "decide"
          ? "EXECUTIVE"
          : "EXPERT",
      intensity:
        finalReasoning.depthHint === "deep" ? "HIGH" : "MEDIUM",
      source: "INFERRED",
    };
  }

      /* ----------------------------------
        4️⃣ Judgment
      ---------------------------------- */
      const judgmentInput: JudgmentInput = {
        path,
        persona: { role: persona },
        traceId,
        rawInput: sanitizedMessage,
      };

      const decision = await judgmentRegistry.evaluate(judgmentInput);

          if (decision.verdict === "HOLD") {
        writeFailureSurface({
          traceId,
          threadId,
          path,
          phase: "judgment",
          failureKind: "VERDICT_HOLD",
          confidenceBefore: finalReasoning.confidence,
          surfaceKey: `${path}:VERDICT_HOLD`,
        });
      }

      /* ----------------------------------
        ✅ FailureSurface + VerifierVerdict (SSOT)
        - 설명/서술 ❌
        - signal only
        - thinkingProfile 계산 입력으로만 사용
      ---------------------------------- */

const softThreshold = continuationThreshold * 0.65;

const continuityAllowed =
  effectiveTurnIntent === "CONTINUATION"
    ? continuationScore >= softThreshold
    : true;

      const isSearchPlanned =
        (executionPlan as { task?: string } | undefined)?.task === "SEARCH";

      const failureSurface: FailureSurface =
        FailureSurfaceEngine.analyze({
          reasoning: finalReasoning,
          turnIntent: (turnIntent as any),
          path,
          anchorConfidence: adjustedAnchorConfidence,
          continuityAllowed,
          inputLength: sanitizedMessage.length,
          sanitizedLength: sanitizedMessage.length,
          searchEnabled: isSearchPlanned,
        });

      // Placeholder hook for explicit verifier failure signals.
      // (No explicit verifier failure source is currently wired in this layer.)
      const explicitVerifierFailure = false;

      let verifierVerdict: VerifierVerdict =
        decision.verdict === "HOLD"
          ? "FAIL"
          : explicitVerifierFailure
          ? "FAIL"
          : failureSurface.risk === "HIGH"
          ? "WEAK"
          : failureSurface.risk === "MEDIUM"
          ? "WEAK"
          : "PASS";

        // 🔥 SSOT: Completion Verdict Bias (NEXT TURN MEMORY)
      const completionAgg =
        await FailureSurfaceAggregator.aggregateCompletionVerdicts({
          lastHours: 6,
        });

      const weakCount =
        completionAgg.find(v => v.verdict === "WEAK")?.count ?? 0;

      if (weakCount >= 3 && verifierVerdict === "PASS") {
        verifierVerdict = "WEAK";
      }

      const yuaMaxHint = await withTimeout(
        Promise.resolve(
          evaluateYuaMaxV0({
            path,
            turnIntent,
            turnFlow,
            anchorConfidence: adjustedAnchorConfidence,
            failureRisk: failureSurface.risk,
            verifierVerdict,
            hasImage,
            hasText,
            inputLength: sanitizedMessage.length,
          })
        ),
        50
      ).catch(() => undefined);

      if (yuaMaxHint) {
        writeRawEvent({
          traceId,
          threadId: threadId ?? null,
          workspaceId: String(instanceId),
          actor: "YUA",
          eventKind: "decision",
          phase: "decision",
          payload: {
            kind: "yua_max_hint",
            risk: yuaMaxHint.risk,
            uncertainty: yuaMaxHint.uncertainty,
            recommendedThinkingProfile:
              yuaMaxHint.recommendedThinkingProfile,
            uiDelayMs: yuaMaxHint.uiDelayMs,
            reasons: yuaMaxHint.reasons,
          },
        });
      }

      const yuaMaxV1Input: YuaMaxV1Input = {
        path,
        turnIntent,
        turnFlow,
        anchorConfidence: adjustedAnchorConfidence,
        failureRisk: failureSurface.risk,
        verifierVerdict,
        inputLength: sanitizedMessage.length,
        modality: hasImage
          ? hasText
            ? "MIXED"
            : "IMAGE_ONLY"
          : "TEXT_ONLY",
      };

      const yuaMaxV1Hint = await withTimeout(
        evaluateYuaMaxV1(yuaMaxV1Input),
        50
      ).catch(() => undefined);

      const yuaMaxV1Meta = getYuaMaxV1LastMeta();
      if (yuaMaxV1Meta) {
        writeRawEvent({
          traceId,
          threadId: threadId ?? null,
          workspaceId: String(instanceId),
          actor: "YUA",
          eventKind: "decision",
          phase: "decision",
          payload: {
            kind: "yua_max_v1_hint",
            input: yuaMaxV1Meta.input,
            output: yuaMaxV1Meta.output,
            latencyMs: yuaMaxV1Meta.latencyMs ?? null,
            error: yuaMaxV1Meta.error ?? null,
          },
        });
      }

      /* ----------------------------------
        🧠 Thinking Profile 결정 (SSOT)
        - Decision 단계 단 1회
        - GPT-like: 실패/불확실/불완전 시 DEEP 승격
      ---------------------------------- */
      let thinkingProfile: ThinkingProfile;

      const requestedDeep = requestedThinkingProfile === "DEEP";
      const requestedFast = requestedThinkingProfile === "FAST";
      const requestedNormal = requestedThinkingProfile === "NORMAL";
      const deepAllowed = requestedDeep === true && !hasImage;

  // 🔥 SSOT: user force flag
  const isForcedDeep =
    input.forceThinking === true &&
    requestedThinkingProfile === "DEEP" &&
    !hasImage;

      // ✅ mode=DEEP도 “깊게 생각” 트리거로 포함 (순환 의존 방지용)
      const depthIsDeep =
        mode === "DEEP" || finalReasoning.depthHint === "deep";

 const metaThresholdsForConfidence =
   metaParams.filter(p => p.target === "THRESHOLD");

  const baseConfidenceCut =
    applyMetaThreshold(0.65, metaThresholdsForConfidence);

  // 🔒 Learning Adjustment Bias (READ ONLY)
  const learningBias =
    await resolveLearningBias({
      workspaceId,
      scope: path,
    });

  const dynamicConfidenceCut =
    Math.max(
      0.4,
      Math.min(
        0.8,
        baseConfidenceCut +
          (learningBias?.confidenceCutDelta ?? 0)
      )
    );

    /* ----------------------------------
        🔍 Control Plane Effect Observation (SSOT)
        - learning adjustment가 decision에 실제 영향 줬는지 기록
        - verdict / path 변경 ❌
        - 관측 전용 RAW EVENT
      ---------------------------------- */
      writeRawEvent({
        traceId,
        threadId: threadId ?? null,
        workspaceId: String(instanceId),
        actor: "YUA",
        eventKind: "decision",
        phase: "decision",
        payload: {
          kind: "control_plane_effect",
          path,
          baseConfidenceCut,
          dynamicConfidenceCut,
          learningBiasApplied: !!learningBias,
          biasDelta: learningBias?.confidenceCutDelta ?? 0,
        },
      });

if (hasImage) {
  if (requestedThinkingProfile === "FAST") {
    thinkingProfile = "FAST";
  } else if (requestedThinkingProfile === "DEEP") {
    thinkingProfile = "DEEP";
  } else {
    thinkingProfile = "NORMAL";
  }
} else {
  if (requestedThinkingProfile === "DEEP") {
    thinkingProfile = "DEEP";
  } else if (requestedThinkingProfile === "FAST") {
    thinkingProfile = "FAST";
  } else {
    thinkingProfile = "NORMAL";
  }
}

// 🔥 Mode align
if (thinkingProfile === "NORMAL" && mode === "FAST") {
  mode = "NORMAL";
}

if (thinkingProfile === "DEEP" && mode !== "DEEP") {
  mode = "DEEP";
}

if (thinkingProfile === "FAST" && mode !== "FAST") {
  mode = "FAST";
}
 const computePanelId = `${traceId}:compute`;

 reasoningPanels.push({
   id: computePanelId,
   source: "decision",
   title: "Computation Strategy",
   index: 2,
   status: "DONE",
   items: [
     {
       id: `${computePanelId}:profile`,
       title: "Thinking Profile",
       body: `${thinkingProfile} (mode: ${mode})`,
       ts: Date.now(),
     },
   ],
 });
      /* ----------------------------------
        🔥 Compute Policy (SSOT)
        - 계산량/딥 수준은 Decision에서만 확정
      ---------------------------------- */
  const computePolicy = decideComputePolicy({
    path,
    mode,
    thinkingProfile,
    hasImage,
    verifierVerdict,
    failureRisk: failureSurface.risk,
    deepVariant: input.deepVariant,
  });

      console.log("[DECISION][COMPUTE_POLICY]", {
        traceId,
        tier: computePolicy.tier,
        maxSegments: computePolicy.maxSegments,
        flushIntervalMs: computePolicy.flushIntervalMs,
        idleMs: computePolicy.idleMs,
        thinkingProfile,
        mode,
        path,
      });
// 🔒 LARGE INPUT → compute tier만 조정 (thinkingProfile 건드리지 않음)
const LARGE_INPUT_THRESHOLD = 1800;

if (sanitizedMessage.length > LARGE_INPUT_THRESHOLD) {
  computePolicy.maxSegments = Math.min(
    computePolicy.maxSegments + 2,
    8
  );
}
      /* ----------------------------------
        5️⃣ Persona Context (Judgment 이후)
      ---------------------------------- */
      let personaContext = defaultPersonaContext("anonymous_user");

      try {
        const behavior = inferPersonaFromAnchors(
          finalReasoning.nextAnchors,
          finalReasoning.confidence
        );

  const permission = await PersonaPermissionEngine.resolve({
    userId: Number(userId ?? 0),
    workspaceId: input.workspaceId,
    verdict: normalizeVerdict(decision.verdict),
    persona,
  });

  personaContext = {
    permission,
    behavior,
    version: "v1",
  };

  // ✅ permission 기준으로 toneAllowed 계산
  toneAllowed = {
    personal: permission.allowPersonalTone === true,
    source: "persona_permission",
  };
      } catch {
        // best-effort (SSOT)
      }

      /* ----------------------------------
        6️⃣ Memory Intent (SSOT HARD GATE)
        - Decision 이후
        - execution 기반
        - 이미지 입력 차단
      ---------------------------------- */
      let memoryIntent: MemoryIntent = "NONE";

      const isDecisionLike =
        decision.verdict === "APPROVE" &&
        finalReasoning.intent === "decide" &&
        (promotedConfidence ?? confidenceAfterPolicy) >= 0.85;

      if (isDecisionLike && !hasImage) {
        memoryIntent = "DECISION";
      }

          /* ----------------------------------
        🔥 SSOT: Declarative Decision Promotion
        - 설계 설명이라도 "확정/선언" 문장은 DECISION으로 승격
        - Reasoning 재실행 ❌
        - Decision 단계에서만 허용
      ---------------------------------- */
      const isDeclarativeCommit =
        language === "ko" &&
        /(확정|선언|동결|기준으로 삼|이후 모든 판단)/.test(
          sanitizedMessage
        );

      const referencesStableArtifact =
        /(v\d+(\.\d+)?|기준|SSOT|헌법|버전)/i.test(
          sanitizedMessage
        );

      if (
        decision.verdict === "APPROVE" &&
        !hasImage &&
        isDeclarativeCommit &&
        referencesStableArtifact
      ) {
        memoryIntent = "DECISION";

  promotedIntent = "decide";
  promotedConfidence = Math.max(
    finalReasoning.confidence,
    0.9
  );
      }

          // 🔒 SSOT: IMAGE INPUT NEVER CREATES MEMORY
      if (hasImage) {
        memoryIntent = "NONE";
      }

  // 🔒 SSOT: REMEMBER는 정보성/선호성/명시적 저장 의도에서만 허용
  const detectedMemoryIntent = detectMemoryIntent(sanitizedMessage);

  const isStorableIntent =
    /(나는 .*이다|나는 .*합니다|앞으로 .*할게|내 스타일은|내 선호는)/.test(
      sanitizedMessage
    ) ||
    /(I am .*|I prefer .*|My style is|From now on I will)/i.test(
      sanitizedMessage
    );
    
  if (
    memoryIntent === "NONE" &&
    detectedMemoryIntent === "REMEMBER" &&
    isStorableIntent &&
    !hasImage
  ) {
    memoryIntent = "REMEMBER";
  }

          /* ----------------------------------
        🔒 ResponseMode 결정 (SSOT)
        - Memory write 이전 확정
      ---------------------------------- */
      let responseMode: "ANSWER" | "CONTINUE" = "ANSWER";

      if (effectiveTurnIntent === "CONTINUATION" && !hasImage) {
        responseMode = "CONTINUE";
      }

      /* ----------------------------------
      🧠 Cross-Thread Memory WRITE (SSOT)
      - Decision 단에서만
      - 1회성
  ---------------------------------- */
  if (
    memoryIntent === "DECISION" &&
    instanceId &&
    userId
  ) {
    const summaryResult =
      CrossMemorySummarizer.summarize({
        sanitizedMessage,
        language,
        path,
        decision,
        executionPlan,
        reasoning: finalReasoning,
        anchorConfidence: adjustedAnchorConfidence,
        memoryIntent,
        conversationalOutcome,
        personaContext,
        mode,
        responseMode,
        turnFlow,
        turnIntent,
        traceId,
        userId,
        threadId,
        instanceId,
      } as DecisionContext);

    if (summaryResult) {
      await CrossMemoryWriter.insert({
        workspaceId: instanceId,
        userId,
        type: summaryResult.type,
        summary: summaryResult.summary,
        facts: summaryResult.facts,
        scope: summaryResult.scope,
        sourceThreadId: threadId,
      });
    }
  }

      // 🔥 PHASE 9: RAW EVENT — DECISION FINALIZED
      writeRawEvent({
        traceId,
        threadId: threadId ?? null,
        workspaceId: String(instanceId), // 🔥 ADD
        actor: "YUA",
        eventKind: "decision",
        phase: "decision",
        payload: {
          kind: "thinking_profile_decision",
          turnIntent,
          anchors: finalReasoning.nextAnchors,
          cognitiveLoad: finalReasoning.cognitiveLoad,
          verifierVerdict,
          failureRisk: failureSurface.risk,
          requestedThinkingProfile,
          resolvedThinkingProfile: thinkingProfile,
        },
        confidence: promotedConfidence ?? confidenceAfterPolicy,
        path,
        verdict: decision.verdict,
      });    

      // 🔒 Persist affordance for next turn (thread-local)
      if (threadId != null && workspaceId) {
       await AffordanceThreadStore.set(
          workspaceId,
          threadId,
          {
            affordance: responseAffordance,
            toneBias,
          }
        );
      }

     /* ----------------------------------
        🔥 THREAD SEMANTIC STATE UPDATE (GRAPH CORE)
      ---------------------------------- */
if (threadId != null) {
  try {
    const extractedEntities =
      extractEntities(sanitizedMessage);

    const mergedEntities = Array.from(
      new Set([
        ...(prevSemanticState?.entityStack ?? []),
        ...extractedEntities,
      ])
    ).slice(0, 8);

    await ThreadSemanticStateRepository.upsert({
      threadId,
      activeTopic: topicResult.topicKey,
      activeIntent: effectiveTurnIntent,
      entityStack: mergedEntities,
      lastUserMessage: sanitizedMessage,
    });
  } catch (e) {
    console.error("[SEMANTIC_STATE_UPDATE_FAIL]", e);
  }
}


      /* ----------------------------------
        ✅ SSOT Result
      ---------------------------------- */
      return {
        sanitizedMessage,
        language,
        path,
        mode,
        thinkingProfile,
        computePolicy,
        reasoningPanels,
        verifierVerdict,
        failureSurface,
        decision,
        timeAxis, // ✅ 여기!
        toolGate,
        toneBias,
        toneAllowed,
        executionPlan,
        responseAffordance,
        conversationalOutcome,
        allowContinuation,
      reasoning: {
        ...finalReasoning,
        __internal: {
          ...(finalReasoning as any).__internal,
          turnIntent,
          inputSignals: {
            hasImage,
            hasText,
            isMultimodal: hasImage || !hasText,
          },
        },
      },
      runtimeHints: {
        depthOverride:
          thinkingProfile === "DEEP" ? "deep" : undefined,
        yuaMax: yuaMaxHint,
        yuaMaxV1: yuaMaxV1Hint,
        forceSearch: forceSearchByContract,
      },
      turnFlow,
        anchorConfidence: adjustedAnchorConfidence,
        responseHint,
        outputTransformHint,
        responseMode,
        memoryIntent,
        personaContext,
        turnIntent,
        traceId,
        userId,
        threadId,
        instanceId: workspaceId,
          // 🔥 ADD
    attachments,
    inputSignals: {
      hasImage,
      hasText,
      isMultimodal: hasImage || !hasText,
      hasQuestionSignal,
    },
    fileSignals: {
      hasFile,
      hasFileIntent,
      relevanceScore: fileRelevanceScore,
    },
    fileRagForceOnce: forceFileRetrievalOnce,
      };
    },
  };
