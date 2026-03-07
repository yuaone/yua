import OpenAI from "openai";
import { pgPool } from "../../db/postgres";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * 요약 규칙 (SSOT)
 * - 사실 / 결정 / 설계만
 * - 잡담 제거
 * - PostgreSQL ONLY
 */
export async function updateConversationSummary(
  threadId: number,
  messages: string[]
) {
  if (messages.length < 12) return;

  const prompt = `
다음 대화를 "지속 기억용 요약"으로 압축하라.

규칙:
- 결정된 사항
- 설계 방향
- 중요한 질문과 답
- 반복된 맥락

대화:
${messages.join("\n")}
`.trim();

  const res = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
    max_output_tokens: 300,
  });

  const summary = String(res.output_text ?? "").trim();
  if (!summary) return;

  await pgPool.query(
    `
    INSERT INTO conversation_summaries (thread_id, content, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (thread_id)
    DO UPDATE SET
      content = EXCLUDED.content,
      updated_at = NOW();
    `,
    [threadId, summary]
  );
}
