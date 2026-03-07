/* ============================================================================
 * sanitizeAssistantForStorage — Persistence Safety Belt (SSOT SAFE)
 * ----------------------------------------------------------------------------
 * 목적:
 * - assistant 응답이 DB에 "영구 오염"되는 것을 방지한다.
 *
 * 적용 위치:
 * - ExecutionEngine DONE 직전, DB 저장 시점 단 1회
 *
 * 절대 금지:
 * - UI 출력에 사용 ❌
 * - ResponseComposer 결과에 적용 ❌
 * - AnswerBuffer / Suggestion / Continuation 입력에 사용 ❌
 *
 * 철학:
 * - 최소 제거 (conservative)
 * - 의미 문장 보존
 * - 내부 메타/지시 블록만 제거
 * ========================================================================== */

const BLOCK_START_PATTERNS = [
  /^\s*\[(STYLE|STYLE NOTE|STYLE GUIDE|CONTEXT NOTE|SYSTEM NOTE|META)\]/i,
  /^\s*\[REFERENCE USAGE RULE/i,
  /^\s*\[TRUSTED FACTS/i,
  /^\s*\[CONSTRAINTS\]/i,
  /^\s*\[FOCUS ANCHOR\]/i,
  /^\s*\[INTERNAL /i,
];

const INLINE_META_PATTERNS = [
  /^\s*Explain clearly/i,
  /^\s*This is a natural continuation/i,
  /^\s*Do not ask/i,
];

function isBlockStart(line: string): boolean {
  return BLOCK_START_PATTERNS.some((re) => re.test(line.trim()));
}

function isInlineMeta(line: string): boolean {
  return INLINE_META_PATTERNS.some((re) => re.test(line.trim()));
}

/* ----------------------------------------------------------------------------
 * 메인 함수
 * -------------------------------------------------------------------------- */
export function sanitizeAssistantForStorage(raw: string): string {
  if (!raw || !raw.trim()) return "";

  const lines = raw.split("\n");
  const output: string[] = [];

  let skippingBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 1️⃣ 블록 시작 감지 → 해당 블록 전체 skip
    if (isBlockStart(trimmed)) {
      skippingBlock = true;
      continue;
    }

    // 2️⃣ 빈 줄을 만나면 블록 종료로 판단
    if (skippingBlock) {
      if (trimmed === "") {
        skippingBlock = false;
      }
      continue;
    }

    // 3️⃣ 단발 메타 문장 제거
    if (isInlineMeta(trimmed)) {
      continue;
    }

    // 4️⃣ 정상 문장 보존
    output.push(line);
  }

  // 5️⃣ 과도한 공백 정리
  const cleaned = output
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}
