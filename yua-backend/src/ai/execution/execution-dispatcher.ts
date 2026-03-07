  // 🔒 EXECUTION DISPATCHER — SSOT FINAL (PHASE 6-1)
  // ----------------------------------------------
  // 책임:
  // - TaskKind → ExecutionPlan 단일 분기
  // - 실행 엔진으로 넘길 "준비된 상태"만 만든다
  //
  // 금지:
  // - 추론 ❌
  // - 판단 ❌
  // - Prompt 생성 ❌

  import type { TaskKind } from "../task/task-kind";
  import type { ExecutionPlan } from "./execution-plan";
  import type { ReasoningResult } from "../reasoning/reasoning-engine";

  import { runVerifierEngine } from "../verifier/verifier-engine";
import { observeImage } from "../image/image-observer";
import { hasImageTransformIntentWithAttachment } from "../image/image-intent-detector";
  import { buildCodeContext } from "../code/code-context-builder";
  import type { ImageObservationInput } from "../image/image-observer";

  function buildQualityHints(args: {
    task: TaskKind;
    reasoning: ReasoningResult;
  }): ExecutionPlan["qualityHints"] {
    const { task, reasoning } = args;

    let primaryRisk:
      | "STATE_CORRUPTION"
      | "TYPE_SAFETY"
      | "ASYNC_RACE"
      | "API_MISUSE"
      | "EXTENSION_PAIN";

    // 🔒 TaskKind 기반 기본 bias (SSOT)
    switch (task) {
      case "TYPE_ERROR_FIX":
        primaryRisk = "TYPE_SAFETY";
        break;
      case "RUNTIME_ERROR_FIX":
        primaryRisk = "ASYNC_RACE";
        break;
      case "CODE_REVIEW":
        primaryRisk = "STATE_CORRUPTION";
        break;
      case "CODE_GENERATION":
      case "REFACTOR":
        primaryRisk = "EXTENSION_PAIN";
        break;
      default:
        primaryRisk = "API_MISUSE";
    }

    // 🔥 Reasoning 기반 보정 (READ-ONLY)
    if (reasoning.intent === "debug") {
      primaryRisk = "ASYNC_RACE";
    }

    if (reasoning.depthHint === "deep" && reasoning.confidence >= 0.8) {
      primaryRisk = "STATE_CORRUPTION";
    }

    const reasoningNoteMap: Record<typeof primaryRisk, string> = {
      STATE_CORRUPTION:
        "If this logic grows, subtle state changes across steps could lead to hard-to-trace bugs.",
      TYPE_SAFETY:
        "If assumptions about types drift over time, runtime failures may appear in unexpected places.",
      ASYNC_RACE:
        "If execution order changes or retries occur, timing-related issues may surface first.",
      API_MISUSE:
        "If the underlying contract is misunderstood or changes, this integration may fail silently.",
      EXTENSION_PAIN:
        "If additional requirements are added later, this structure may become difficult to extend cleanly.",
    };

    return {
      primaryRisk,
      reasoningNote: reasoningNoteMap[primaryRisk],
    };
  }

  /* -------------------------------------------------- */
  /* Dispatcher Input                                    */
  /* -------------------------------------------------- */

  export interface ExecutionDispatchInput {
    task: TaskKind;
    message: string;
    reasoning: ReasoningResult;

    imageData?: ImageObservationInput;
    codeBlock?: string;
    errorLog?: string;
  }

  /* -------------------------------------------------- */
  /* Dispatcher                                          */
  /* -------------------------------------------------- */

  export async function dispatchExecution(
    input: ExecutionDispatchInput
  ): Promise<ExecutionPlan> {
    const {
      task,
      message,
      reasoning,
      imageData,
      codeBlock,
      errorLog,
    } = input;

  /* ---------------------------------------------- */
  /* 🖼️ IMAGE ANALYSIS (SSOT)                        */
  /* ---------------------------------------------- */
  if (task === "IMAGE_ANALYSIS") {
        const observation =
      imageData
        ? observeImage(imageData)
        : {
            hints: ["UNCLEAR_IMAGE"],
            hasCode: false,
            hasErrorLog: false,
            observationConfidence: 0,
          };

          const hasImageInput = Boolean(imageData);
          const wantsTransform = hasImageTransformIntentWithAttachment(message);
          const shouldGenerateAsset = hasImageInput && wantsTransform;



    return {
      task: "IMAGE_ANALYSIS",
      payload: {
        observation,
        // ✅ SSOT: IMAGE_ANALYSIS side-effect는 "실제 이미지 입력"이 있을 때만
        nextAction: shouldGenerateAsset ? "GENERATE_ASSET" : undefined,
        uxHint: shouldGenerateAsset ? "ANALYZING_IMAGE" : undefined,
        },
      confidence: reasoning.confidence,
    };
  }

  /* ---------------------------------------------- */
  /* 🎨 IMAGE GENERATION (TEXT → IMAGE)              */
  /* ---------------------------------------------- */
  if (task === "IMAGE_GENERATION") {
    return {
      task: "IMAGE_GENERATION",
      payload: {
        message,
      },
      confidence: reasoning.confidence,
    };
  }


    /* ---------------------------------------------- */
    /* 🔥 CODE VERIFY / ERROR FIX                      */
    /* ---------------------------------------------- */
    if (
      task === "CODE_REVIEW" ||
      task === "TYPE_ERROR_FIX" ||
      task === "RUNTIME_ERROR_FIX"
    ) {
      const contextResult = buildCodeContext({
        code: codeBlock,
        errorLog,
        languageHint: "auto",
      });

      if (!contextResult.ok) {
    return {
      task,
      payload: {
        verifiedContext: null,
      },
      confidence: reasoning.confidence,
    };
  }

      const verification = runVerifierEngine({
        task,
        context: contextResult.context,
        reasoning,
      });

      if (!verification.ok) {
        // 🔒 SSOT: Dispatcher MUST NOT fail execution due to missing optional context
        // → Degrade gracefully and let downstream (Prompt/Engine) decide response
        return {
          task,
          payload: {
            verifiedContext: null,
            verification: verification.detail,
            status: "NEEDS_MORE_CONTEXT",
          },
          confidence: verification.confidence,
          qualityHints: buildQualityHints({ task, reasoning }),
          
        };
      }

      return {
        task,
        payload: {
          verifiedContext: verification.result,
        },
        confidence: verification.confidence,
        qualityHints: buildQualityHints({ task, reasoning }),
      };
    }

    /* ---------------------------------------------- */
    /* 🔥 CODE GENERATION / REFACTOR                   */
    /* ---------------------------------------------- */
    if (task === "CODE_GENERATION" || task === "REFACTOR") {
      const contextResult = buildCodeContext({
        code: codeBlock,
        languageHint: "auto",
      });

      if (!contextResult.ok) {
    return {
      task,
      payload: {
        codeContext: null,
        status: "READY_FOR_GENERATION",
      },
      confidence: reasoning.confidence,
      qualityHints: buildQualityHints({ task, reasoning }),
    };
  }
      return {
        task,
        payload: {
          codeContext: contextResult.context,
          status: "READY_FOR_GENERATION",
        },
        confidence: reasoning.confidence,
        qualityHints: buildQualityHints({ task, reasoning }),
      };
    }

    /* ---------------------------------------------- */
    /* 🔥 FILE INTELLIGENCE                           */
    /* ---------------------------------------------- */
    if (task === "FILE_INTELLIGENCE") {
      return {
        task,
        payload: {
          message,
        },
        confidence: reasoning.confidence,
      };
    }

    /* ---------------------------------------------- */
    /* 🔥 DIRECT CHAT                                  */
    /* ---------------------------------------------- */
    if (task === "DIRECT_CHAT") {
      return {
        task,
        payload: {
          message,
        },
        confidence: reasoning.confidence,
      };
    }

    /* ---------------------------------------------- */
    /* 🔥 SEARCH VERIFY                                */
    /* ---------------------------------------------- */
    if (task === "SEARCH_VERIFY") {
      return {
        task,
        payload: {
          message,
        },
        confidence: reasoning.confidence,
      };
    }
  /* ---------------------------------------------- */
  /* 🔥 SEARCH (ENGINE-INTEGRATED)                  */
  /* ---------------------------------------------- */
 if (task === "SEARCH") {
   // 🔒 SSOT: SEARCH는 ExecutionEngine 내부(OpenAI built-in tool)에서 처리
   // Dispatcher는 단순 패스스루만 수행한다.
   return {
     task: "SEARCH",
     payload: {
       message,
     },
     confidence: reasoning.confidence,
   };
 }
    /* ---------------------------------------------- */
    /* ❌ SHOULD NEVER HAPPEN                          */
    /* ---------------------------------------------- */
    throw new Error(`Unsupported TaskKind: ${task}`);
  }
