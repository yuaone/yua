  // 📂 src/ai/chat/runtime/context-runtime.ts
  // 🔥 YUA Context Runtime — PHASE 12-1-D (WEIGHTED CONTEXT)
  // --------------------------------------------------
  // ✔ RAW selection 기반
  // ✔ GENERATED 설명 / 요약 메모리 차단
  // ✔ 설계/결정 맥락만 continuation 허용
  // ✔ SSOT / Side-effect 없음
  // --------------------------------------------------
  /**
   * SSOT — MEMORY & CONTINUITY CONSTITUTION
   *
 * - RAW는 관성(inertia) 신호일 뿐 사실이 아니다.
 * - QUESTION은 항상 새 판단을 수행한다.
 * - CONTINUATION에서만 RAW carry를 허용한다.
 * - SUMMARY(conversationState)는 항상 허용된다.
 * - MEMORY는 이어지는 질문에서만 조건부 허용된다.
   * - SHIFT만이 유일한 context 약화 트리거다.
   * - 차단(exclude) 금지, 약화(degrade)만 허용.
   */


  import { ContextMerger } from "../../context/context-merger";
  import { MemoryManager } from "../../memory/memory-manager";
  import { loadUnifiedMemory } from "../../memory/unified-memory-gate";
  import { buildConversationContext } from "../../context/buildConversationContext";
  import type { MemoryChunk } from "../../context/context-merger";
  import type { SearchResult } from "../../search/allowed-search-engine";
  import {
    classifyConversationTurns,
    type SemanticTurn,
  } from "../../context/conversation-turn-semantic";
 import { ThreadSemanticStateRepository } from "../../semantic/thread-semantic-state-repository";
 import { shouldForceContinuation } from "../../semantic/graph-continuation";
  /* --------------------------------------------------
  * Selection Limits (SSOT)
  * -------------------------------------------------- */
  const MAX_CONVERSATION_CHUNKS = 11;
  const MAX_MEMORY_CHUNKS = 8;

  /* --------------------------------------------------
  * Heuristic: GENERATED EXPLANATION FILTER
  * -------------------------------------------------- */
  function isGeneratedExplanation(text: string): boolean {
    return (
      /단계별|절차|목표 설정|요약하면|다음과 같이|각 단계|설명하면/.test(text)
    );
  }

  export type ContextRuntimeResult = {
    memoryContext?: string;
    trustedFacts?: string[];
    researchContext?: string;
    constraints?: string[];
    conversationState?: string;

    // 🔥 Continuity Signals (SSOT)
    anchorConfidence: number;
    continuityAllowed: boolean;
    contextCarryLevel: "RAW" | "SEMANTIC" | "ENTITY";
  };

  export async function runContextRuntime(args: {
    threadId?: number | string;
    workspaceId?: string;
    userId?: number;
    allowMemory: boolean;
    turnIntent?: "QUESTION" | "CONTINUATION" | "SHIFT";
    userMessageLength?: number;
    userMessage?: string;
    isSelfInquiry?: boolean;
    searchResults?: SearchResult[];
    researchContext?: string;
    constraints?: string[];
    mode?: "FAST" | "NORMAL" | "SEARCH" | "DEEP" | "RESEARCH";
    responseAffordance?: {
    expand?: number;
    clarify?: number;
    branch?: number;
  };
  }): Promise<ContextRuntimeResult> {
    const {
      threadId,
      workspaceId,
      turnIntent,
      userMessageLength,
      allowMemory,
      searchResults = [],
      researchContext,
      mode,
      userMessage,
    } = args;

    // 🔒 SSOT: constraints는 재할당 금지 → 로컬 복사본 사용
    let effectiveConstraints = args.constraints;

      /* ==================================================
      🧠 Self Memory Gate (SSOT)
      - 자기 인식 질문에서만
      - SYSTEM constraint로만 주입
    ================================================== */
  if (args.isSelfInquiry === true && workspaceId) {
      try {
        const selfMemory = await MemoryManager.getSelfMemory({
          workspaceId,
        });

        if (selfMemory) {
      // 🔒 SSOT: 헌법 전문은 system prompt에서만 유지
      // runtime에는 key/version만 전달 (토큰 절감)
      effectiveConstraints = [
        ...(effectiveConstraints ?? []),
        `[SELF_MEMORY_REF key=${selfMemory.constitutionKey} v=${selfMemory.version}]`,
      ];
        }
      } catch {
        // SSOT: silent fail
      }
    }

    /* ==================================================
      1️⃣ Turn Guards
    ================================================== */

  const hasThread = Boolean(threadId);

  // 🔥 CODE INPUT MODE (SSOT SAFE)
  const hasCodeBlock =
    typeof args.userMessageLength === "number" &&
    args.userMessageLength > 0 &&
    false; // placeholder (length-only guard below)

  const isLargeInput = (userMessageLength ?? 0) > 3000;

  const isCodeInput =
    isLargeInput &&
    typeof args.userMessageLength === "number";

  // 🔒 SSOT: continuation / heavyMemory는 Conversation 분석 결과
  let isContinuation = false;
  let allowHeavyMemory = false;
  let isSemanticContinuation = false;
  let graphForcedContinuation = false;
    const threadIdNum =
      typeof threadId === "string" ? Number(threadId) : threadId;

    /* ==================================================
      2️⃣ Conversation Context (RAW SELECTION)
    ================================================== */
    const conversationChunks: MemoryChunk[] = [];
    let conversationState: string | undefined;

    let anchorConfidence = 0;
    let continuityAllowed = false;
    let contextCarryLevel: "RAW" | "SEMANTIC" | "ENTITY" = "ENTITY";

    if (Number.isFinite(threadIdNum)) {
      try {
        const conversation = await buildConversationContext(
          threadIdNum as number,
          20
        );

        conversationState = conversation.conversationState;

        const semanticTurns = classifyConversationTurns(
          conversation.recentMessages
        );

      
  // 🔥 FOLLOW_UP 기반 semantic continuation
        // 🔥 FOLLOW_UP 기반 semantic continuation (SSOT)
        isSemanticContinuation = semanticTurns.some((t: SemanticTurn) => {
          return (
            t.role === "user" &&
            t.relation?.dependsOnPrev === true &&
            t.relation?.relationType === "FOLLOW_UP"
          );
        });
  /**
   * SSOT:
   * CONTINUATION은 memory 사용의 gate가 아니다.
   * 오직 "가중치(weight) 신호"로만 사용한다.
   */


  /**
   * SSOT:
   * - Memory는 기본적으로 항상 허용된다.
   * - QUESTION은 차단 사유가 아니다.
   * - SHIFT만 context 약화의 트리거다.
   */

        const lastAssistantTurn = [...semanticTurns]
          .reverse()
          .find(t => t.role === "assistant");

        if (lastAssistantTurn) {
          anchorConfidence = 0.55;

  if ((userMessageLength ?? 0) <= 14) {
    // GPT-style: 짧은 follow-up은 강한 continuation
    anchorConfidence += 0.45;
  }

 if (turnIntent === "CONTINUATION") {
   anchorConfidence += 0.35;
 } else if (isSemanticContinuation) {
   anchorConfidence += 0.2;
 }
        }

        anchorConfidence = Math.min(1, anchorConfidence);
        // 🔥 Continuity Stabilizer (Short Follow-up Bias)
        const isShortFollowUp =
          hasThread &&
          turnIntent === "QUESTION" &&
          (userMessageLength ?? 0) <= 25;

        if (isShortFollowUp) {
          anchorConfidence += 0.25;
        }

        anchorConfidence = Math.min(1, anchorConfidence);
        const affordanceContinuationBias =
          args.responseAffordance?.expand != null &&
          args.responseAffordance.expand >= 0.4;

       /* ==================================================
          🔥 GRAPH CONTINUATION OVERRIDE (SSOT)
          - Heuristic 이전에 상태 기반 강제 판정
        ================================================== */
        try {
          const semanticState =
            await ThreadSemanticStateRepository.get(threadIdNum as number);

          if (
            semanticState &&
            shouldForceContinuation({
              userMessage: userMessage ?? "",
              activeTopic: semanticState.activeTopic,
              turnIntent,
            })
          ) {
            graphForcedContinuation = true;
            anchorConfidence = Math.max(anchorConfidence, 0.75);

            console.log("[GRAPH_OVERRIDE] continuation forced", {
              threadId: threadIdNum,
              activeTopic: semanticState.activeTopic,
            });
          }
        } catch {
          // silent
        }

 continuityAllowed =
   (anchorConfidence >= 0.35 || affordanceContinuationBias) &&
   turnIntent !== "SHIFT";

           // 🔒 SSOT: continuity 판결 이후 continuation 해석
 isContinuation =
  graphForcedContinuation ||
  turnIntent === "CONTINUATION" ||
  isSemanticContinuation;

 // 🔥 FIX: QUESTION도 memory 차단 사유가 아니다 (SSOT)
 // - SHIFT만 약화 트리거
 // - continuityAllowed는 "가중치/연속성 신호"로만 사용
 // - 큰 입력(코드/대량 paste)은 heavy memory 차단 유지
 allowHeavyMemory =
   hasThread &&
   turnIntent !== "SHIFT" &&
   !isCodeInput;

        // 🔒 SSOT FIX:
  /**
   * SSOT:
   * carry level은 continuity의 "강도"를 표현할 뿐
   * memory 사용 여부를 결정하지 않는다.
   */
        // 🔥 GPT-style: 새 질문은 RAW를 우선
 if (isContinuation && continuityAllowed) {
   contextCarryLevel = "SEMANTIC";
 } else if (
   hasThread &&
   turnIntent === "QUESTION" &&
   anchorConfidence >= 0.3
 ) {
   // 🔥 Weak Continuity Preserve
   contextCarryLevel = "SEMANTIC";
 } else {
   contextCarryLevel = "ENTITY";
 }

        const effectiveTurns: SemanticTurn[] = [];

        for (let i = semanticTurns.length - 1; i >= 0; i--) {
          const t = semanticTurns[i];
          if (t.semantic === "SOCIAL_NOISE") continue;
          effectiveTurns.push(t);
          if (turnIntent === "SHIFT") break;
        }

        if (
          effectiveTurns.length === 0 &&
          semanticTurns.length > 0 &&
          turnIntent !== "SHIFT"
        ) {
          effectiveTurns.push(semanticTurns[semanticTurns.length - 1]);
        }

        effectiveTurns.reverse();

            // 🔒 SSOT:
        // GENERATED 설명은 carryLevel을 낮추는 신호일 뿐
        // merge 이전에 반영해야 한다
        if (
          conversationState &&
          isGeneratedExplanation(conversationState)
        ) {
          contextCarryLevel = "ENTITY";
        }

 // Include recent conversation turns for context continuity
 // Both user AND assistant messages matter for maintaining coherence
 if (continuityAllowed && !isCodeInput) {
   const sliceSize = isContinuation ? 6 : 4;
   for (const t of effectiveTurns.slice(-sliceSize)) {
     // Include assistant messages but truncate long ones
     const content = t.role === "assistant" && t.content.length > 500
       ? t.content.slice(0, 500) + "..."
       : t.content;
     conversationChunks.push({
       content: `${t.role.toUpperCase()}: ${content}`,
       scope: "general_knowledge",
     });
   }
 } else if (
   // Fallback: when general block didn't fire, at least include last pair for QUESTION turns
   !isContinuation &&
   turnIntent === "QUESTION" &&
   effectiveTurns.length > 0
 ) {
   const lastPair = effectiveTurns.slice(-2);
   for (const t of lastPair) {
     const content = t.content.length > 300
       ? t.content.slice(0, 300) + "..."
       : t.content;
     conversationChunks.push({
       content: `[Previous ${t.role}]: ${content}`,
       scope: "summary",
     });
   }
 }
}catch {
        // silent fail
      }
    }

    /* ==================================================
      3️⃣ Unified Memory (User + Project + Cross-Thread)
    ================================================== */
    let userContextChunks: MemoryChunk[] = [];
    let architectureChunks: MemoryChunk[] = [];
    let decisionChunks: MemoryChunk[] = [];
    let crossThreadChunks: MemoryChunk[] = [];

    if (allowMemory && workspaceId && args.userId) {
      try {
        const unified = await loadUnifiedMemory({
          workspaceId,
          userId: args.userId,
          threadId: threadIdNum,
          mode,
          allowHeavyMemory: allowHeavyMemory && !isCodeInput,
        });

        // User context (always loaded)
        if (unified.userContext) {
          userContextChunks = [{
            content: unified.userContext,
            scope: "personal",
          }];
        }

        // Project context (architecture + decision)
        if (unified.projectContext) {
          architectureChunks = [{
            content: unified.projectContext,
            scope: "domain",
          }];
        }

        // Cross-thread context
        if (unified.crossThreadContext) {
          crossThreadChunks = [{
            content: unified.crossThreadContext,
            scope: "personal",
          }];
        }
      } catch {
        // silent fail
      }
    } else if (allowMemory && workspaceId && allowHeavyMemory) {
      // Fallback: userId not available — load project memory only (legacy path)
      try {
        const architecture = await MemoryManager.retrieveByScope({
          workspaceId,
          scope: "project_architecture",
          limit: isCodeInput ? 3 : MAX_MEMORY_CHUNKS,
        });

        architectureChunks = architecture.map(m => ({
          content: `[Architecture]\n${m.content}`,
          scope: "domain",
        }));

        const decisions = isCodeInput
          ? []
          : await MemoryManager.retrieveByScope({
              workspaceId,
              scope: "project_decision",
              limit: MAX_MEMORY_CHUNKS,
            });

        decisionChunks = decisions.map(m => ({
          content: `[Decision — POLICY]\n${m.content}`,
          scope: "personal",
        }));
      } catch {
        // silent fail
      }
    }

    /* ==================================================
      4️⃣ Merge
    ================================================== */
    const merged = ContextMerger.merge({
      searchResults,
      memoryChunks: [
        ...conversationChunks,
        ...userContextChunks,
        ...crossThreadChunks,
        ...architectureChunks,
        ...decisionChunks,
      ],
      conversationState,
      researchContext,
      constraints: effectiveConstraints,
      contextCarryLevel,
    });

    // 🔒 SSOT FIX:
    // GENERATED 설명은 merge 이전 carryLevel을 강제 약화해야 함
    if (
      merged.userContext &&
      isGeneratedExplanation(merged.userContext)
    ) {
      contextCarryLevel = "ENTITY";
    }

  /* ==================================================
    🔥 GENERATED EXPLANATION → SEMANTIC DEGRADE (SSOT)
  ================================================== */
  /**
   * SSOT:
   * - Explanation은 삭제하지 않는다
   * - 차단(exclude) 금지
   * - RAW → SEMANTIC carry level로 강등만 수행
   */
  if (merged.userContext && isGeneratedExplanation(merged.userContext)) {
    // 🔒 SSOT: 설명은 사실이 아니다
    contextCarryLevel = "ENTITY";
  }
    /* ==================================================
      5️⃣ Trusted Facts
    ================================================== */
const trustedFacts: undefined = undefined;

    console.log("[CTX_RUNTIME][SSOT]", {
      threadId,
      turnIntent,
      allowHeavyMemory,
      isSemanticContinuation,
      anchorConfidence,
      continuityAllowed,
      contextCarryLevel,
      memoryContextLength: merged.userContext?.length ?? 0,
    });

    /* ==================================================
      6️⃣ Return
    ================================================== */
    return {
      memoryContext: merged.userContext,
      trustedFacts,
      researchContext,
      constraints: effectiveConstraints,
      conversationState,
      anchorConfidence,
      continuityAllowed,
      contextCarryLevel,
    };
  }
