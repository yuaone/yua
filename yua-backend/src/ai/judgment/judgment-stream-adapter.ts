// 🔒 STEP 6 — Judgment Stream Adapter (FINAL, SSOT SAFE)
// 역할: Judgment 결과를 "상태 힌트"로만 전달
// token / done / 판단 주체 노출 ❌

import { StreamEngine } from "../engines/stream-engine";
import type {
  YuaStreamEvent,
  YuaStreamEventKind,
  YuaStreamStage,
} from "../../types/stream";

import type { DecisionResult } from "../../types/decision";
import { formatJudgmentResult } from "./judgment-result-formatter";
import { generateJudgmentNarration } from "./judgment-narration";
import { guardStreamOutput } from "./stream-output-guard";

/**
 * SSOT RULE (LOCKED):
 * - DecisionResult의 공통 필드만 사용
 * - verdict / confidence 외 참조 금지
 * - Judgment 단계에서 token / done 발행 금지
 */
export async function streamJudgmentResult(
  threadId: number,
  decision: DecisionResult,
  traceId?: string
): Promise<void> {
}
