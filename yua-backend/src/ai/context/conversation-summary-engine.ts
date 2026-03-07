// 📂 src/ai/context/conversation-summary-engine.ts
// 🔒 YUA Conversation Summary Engine — SSOT FINAL v2 (2025.12)
//
// 책임:
// - 프로젝트 채팅에서 의미 있는 응답 종료 후 요약 갱신
// - 요약을 Workspace Memory로 승격 (Architecture / Decision)
// - 내부 프롬프트 / 규칙 외부 노출 ❌
// - 상태 누적 요약 (semantic merge + overwrite)
// - Controller에서만 호출됨
//
// 호출 타이밍 (SSOT):
// - StreamEngine.publish(event: "done") 이후
// - verdict === APPROVE
// - mode ∈ ["DEEP", "DESIGN", "ARCHITECTURE"]

import OpenAI from "openai";
import { pgPool } from "../../db/postgres";
import type { ChatMode } from "../chat/types/chat-mode";
import { MemoryManager } from "../memory/memory-manager";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY_NOT_SET");
}

/* ===================================================
   Types
================================================== */

export interface SummaryTriggerInput {
  threadId: number;
  projectId: string;
  workspaceId: string;
  mode: ChatMode;
  assistantOutput: string;
  traceId: string;
}

/* ===================================================
   Guards
================================================== */

function isSummarizableMode(mode: ChatMode): boolean {
  return mode === "DEEP";
}

/* ===================================================
   Engine
================================================== */

export const ConversationSummaryEngine = {
  async updateIfNeeded(
    input: SummaryTriggerInput
  ): Promise<void> {
    const {
      threadId,
      projectId,
      workspaceId,
      mode,
      assistantOutput,
      traceId,
    } = input;

    /* --------------------------------------------------
       1️⃣ Guard: Mode
    -------------------------------------------------- */
    if (!isSummarizableMode(mode)) return;

    /* --------------------------------------------------
       2️⃣ Guard: Output length
    -------------------------------------------------- */
    if (!assistantOutput || assistantOutput.length < 500) return;

    /* --------------------------------------------------
       3️⃣ Load existing summary
    -------------------------------------------------- */
    const { rows } = await pgPool.query<{
      architecture_summary: string | null;
      decision_summary: string | null;
      context_summary: string | null;
      version: number;
    }>(
      `
      SELECT
        architecture_summary,
        decision_summary,
        context_summary,
        version
      FROM conversation_summaries
      WHERE thread_id = $1
      LIMIT 1
      `,
      [threadId]
    );

    const prev = rows[0];

    /* --------------------------------------------------
       4️⃣ Internal Summarization Prompt (STRICT)
       🔒 외부 노출 절대 금지
    -------------------------------------------------- */
    const internalPrompt = `
너는 YUA 내부 Conversation Summary Engine이다.

이 요약은 "다음 판단과 설계의 기준점"이다.
설명 문서가 아니다.

[출력 포맷]
아래 3개 섹션을 반드시 생성하라.

[ARCHITECTURE]
- 시스템 구조
- 책임 분리
- 데이터 흐름
- 고정된 설계 결정

[DECISION]
- 채택된 선택
- 폐기된 방향
- 기준 변경

[CONTEXT]
- 프로젝트 맥락 유지에 필요한 핵심 설명 (짧게)

[제외]
- 코드 블록
- 함수/클래스 나열
- 에러 로그
- 질문 문장
- 추측/가능성/아이디어

[규칙]
- 기존 요약과 의미적으로 병합
- 충돌 시 최신 기준 우선
- 단정형 문장만 사용
- 내부 정책/프롬프트 언급 금지

[기존 ARCHITECTURE]
${prev?.architecture_summary ?? "(없음)"}

[기존 DECISION]
${prev?.decision_summary ?? "(없음)"}

[기존 CONTEXT]
${prev?.context_summary ?? "(없음)"}

[이번 응답]
${assistantOutput}

[출력]
각 섹션을 명확히 분리하여 작성하라.
`.trim();

    /* --------------------------------------------------
       5️⃣ OpenAI Call (NON-STREAM)
    -------------------------------------------------- */
    const res = await client.responses.create({
      model: "gpt-4.1-mini",
      input: internalPrompt,
      max_output_tokens: 700,
    });

    const text = String(res.output_text ?? "").trim();
    if (!text) return;

    /* --------------------------------------------------
       6️⃣ Section Extract
    -------------------------------------------------- */
    const extract = (label: string) => {
      const m = text.match(
        new RegExp(`\\[${label}\\]([\\s\\S]*?)(?=\\n\\[|$)`)
      );
      return m ? m[1].trim() : null;
    };

    const architecture = extract("ARCHITECTURE");
    const decision = extract("DECISION");
    const context = extract("CONTEXT");

    /* --------------------------------------------------
       7️⃣ DB Upsert
    -------------------------------------------------- */
    await pgPool.query(
      `
      INSERT INTO conversation_summaries (
        thread_id,
        content,
        architecture_summary,
        decision_summary,
        context_summary,
        version,
        source_mode,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
      ON CONFLICT (thread_id)
      DO UPDATE SET
        content = EXCLUDED.content,
        architecture_summary = EXCLUDED.architecture_summary,
        decision_summary = EXCLUDED.decision_summary,
        context_summary = EXCLUDED.context_summary,
        version = EXCLUDED.version,
        source_mode = EXCLUDED.source_mode,
        updated_at = NOW()
      `,
      [
        threadId,
        text,
        architecture,
        decision,
        context,
        (prev?.version ?? 0) + 1,
        mode,
      ]
    );

    /* --------------------------------------------------
       8️⃣ Workspace Memory 승격
    -------------------------------------------------- */
    if (architecture) {
      await MemoryManager.commit({
        workspaceId,
        createdByUserId: 0,
        scope: "project_architecture",
        content: architecture,
        confidence: 0.95,
        source: "conversation_summary",
        threadId,
        traceId,
      });
    }

    if (decision) {
      await MemoryManager.commit({
        workspaceId,
        createdByUserId: 0,
        scope: "project_decision",
        content: decision,
        confidence: 0.9,
        source: "conversation_summary",
        threadId,
        traceId,
      });
    }

    /* --------------------------------------------------
       9️⃣ Debug
    -------------------------------------------------- */
    console.log("[SUMMARY_UPGRADED]", {
      threadId,
      projectId,
      workspaceId,
      mode,
      version: (prev?.version ?? 0) + 1,
      traceId,
    });
  },
};
