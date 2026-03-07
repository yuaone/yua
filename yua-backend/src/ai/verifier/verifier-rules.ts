// 🔒 VERIFIER RULES — SSOT FINAL (PHASE 6-2)
// ----------------------------------------
// 책임:
// - 코드/에러로그를 "검증 관점"으로 구조화
// - TaskKind별 최소 검증 룰 적용
//
// 금지:
// - LLM 의존 ❌
// - async ❌
// - side effect ❌
// - "코드 생성" ❌ (여긴 검증/판단용 신호만)

import type { TaskKind } from "../task/task-kind";

/* -------------------------------------------------- */
/* Types                                               */
/* -------------------------------------------------- */

export type VerifierIssueKind =
  | "MISSING_CONTEXT"
  | "TYPE_ERROR"
  | "RUNTIME_ERROR"
  | "LOGIC"
  | "SECURITY"
  | "STYLE";

export interface VerifierIssue {
  kind: VerifierIssueKind;
  message: string;
  evidence?: string;
  hint?: string;
}

export interface CodeContextLike {
  code?: string;
  errorLog?: string;
  language?: string; // "auto" allowed
  hasCode: boolean;
  hasErrorLog: boolean;
}

export interface VerifierOutput {
  summary: string;
  issues: VerifierIssue[];

  /**
   * 다음 단계 가이드 (LLM/개발자가 수행할 액션 힌트)
   * - 여기서 실제 코드 생성/수정은 하지 않는다
   */
  nextStep: {
    action:
      | "REQUEST_MORE_CONTEXT"
      | "READY_TO_REVIEW"
      | "READY_TO_FIX"
      | "READY_TO_GENERATE_PATCH";
    note?: string;
  };

  /**
   * "지금 이 입력만으로" 코드 패치까지 가도 되는가
   * - true여도 verifier는 patch를 만들지 않는다
   * - downstream (Prompt/LLM)에서 사용
   */
  safeToGenerateFix: boolean;
}

/* -------------------------------------------------- */
/* Small Utils                                          */
/* -------------------------------------------------- */

function pickFirstLine(text?: string): string | undefined {
  if (!text) return undefined;
  const t = text.trim();
  if (!t) return undefined;
  const i = t.indexOf("\n");
  return i >= 0 ? t.slice(0, i).trim() : t;
}

function hasTsSignals(text: string): boolean {
  return /(tsc|typescript|TS\d{3,5}|type\s+error|타입\s*오류|형식\s*오류)/i.test(
    text
  );
}

function hasRuntimeSignals(text: string): boolean {
  return /(TypeError|ReferenceError|SyntaxError|RangeError|Unhandled|stack|exception|crash|segfault|panic)/i.test(
    text
  );
}

function hasStackTrace(text: string): boolean {
  return /(at\s+\S+\s+\(|\bstack\b|Stack trace)/i.test(text);
}

function maybeSecurityRedFlag(code: string): boolean {
  // 아주 보수적 룰: 위험 API 사용 흔적만 표시 (판정/차단은 Policy/Judgment)
  return /(eval\(|new Function\(|child_process|exec\(|spawn\(|rm\s+-rf|curl\s+http|wget\s+http)/i.test(
    code
  );
}

/* -------------------------------------------------- */
/* Main Rules                                           */
/* -------------------------------------------------- */

export function verifyForTask(params: {
  task: TaskKind;
  message: string;
  context: CodeContextLike;
}): { ok: boolean; output: VerifierOutput; reason?: string } {
  const { task, message, context } = params;

  const issues: VerifierIssue[] = [];

  // ✅ 공통: 코드/로그 부족 검증
  if (
    (task === "CODE_REVIEW" ||
      task === "TYPE_ERROR_FIX" ||
      task === "RUNTIME_ERROR_FIX" ||
      task === "REFACTOR") &&
    context.hasCode !== true
  ) {
    issues.push({
      kind: "MISSING_CONTEXT",
      message: "코드가 제공되지 않았습니다.",
      hint: "관련 파일(또는 최소 재현 코드)을 붙여주세요.",
    });
  }

  if (
    (task === "TYPE_ERROR_FIX" || task === "RUNTIME_ERROR_FIX") &&
    context.hasErrorLog !== true
  ) {
    issues.push({
      kind: "MISSING_CONTEXT",
      message: "에러 로그가 제공되지 않았습니다.",
      hint: "에러 메시지 + stack trace(가능하면)까지 붙여주세요.",
    });
  }

  // ✅ 에러로그 분석 (신호만)
  if (context.errorLog) {
    const head = pickFirstLine(context.errorLog);
    const log = context.errorLog;

    if (hasTsSignals(log)) {
      issues.push({
        kind: "TYPE_ERROR",
        message: "TypeScript 타입 오류 신호가 감지되었습니다.",
        evidence: head,
        hint: "TS 에러 코드(TSxxxx)와 해당 파일/라인 정보를 함께 주면 정확도가 상승합니다.",
      });
    } else if (hasRuntimeSignals(log)) {
      issues.push({
        kind: "RUNTIME_ERROR",
        message: "런타임 오류 신호가 감지되었습니다.",
        evidence: head,
        hint: "stack trace 전체 + 재현 입력이 있으면 원인 특정이 쉬워집니다.",
      });
    } else {
      // 에러 로그가 있으나 분류가 애매한 경우
      issues.push({
        kind: "LOGIC",
        message: "에러 로그가 있으나 타입/런타임 분류가 명확하지 않습니다.",
        evidence: head,
        hint: "전체 로그/stack trace 및 실행 환경(node 버전, tsconfig)을 추가해 주세요.",
      });
    }

    if (!hasStackTrace(log) && (task === "RUNTIME_ERROR_FIX" || task === "TYPE_ERROR_FIX")) {
      issues.push({
        kind: "MISSING_CONTEXT",
        message: "stack trace가 부족합니다.",
        hint: "최소한 첫 에러 라인 + 호출 스택 일부가 필요합니다.",
      });
    }
  }

  // ✅ 코드 위험 신호(표시만)
  if (context.code && maybeSecurityRedFlag(context.code)) {
    issues.push({
      kind: "SECURITY",
      message: "잠재적으로 위험한 코드 패턴이 감지되었습니다.",
      hint: "실행/삭제/원격호출 관련 코드는 verifier budget 및 sandbox에서만 다루는 것을 권장합니다.",
    });
  }

  // ✅ Task별 최종 상태 결정
  const missing = issues.some((i) => i.kind === "MISSING_CONTEXT");

  const safeToGenerateFix =
    !missing &&
    (task === "TYPE_ERROR_FIX" || task === "RUNTIME_ERROR_FIX") &&
    context.hasCode === true &&
    context.hasErrorLog === true;

  const output: VerifierOutput = {
    summary: buildSummary(task, issues),
    issues,
    nextStep: decideNextStep(task, missing, safeToGenerateFix, message),
    safeToGenerateFix,
  };

  // ok 기준: FIX/REVIEW 계열은 "필수 컨텍스트"가 없으면 false
  const ok =
    task === "TYPE_ERROR_FIX" || task === "RUNTIME_ERROR_FIX" || task === "CODE_REVIEW"
      ? !missing
      : true;

  return {
    ok,
    output,
    reason: ok ? undefined : "missing_required_context",
  };
}

function buildSummary(task: TaskKind, issues: VerifierIssue[]): string {
  const counts = issues.reduce<Record<string, number>>((acc, i) => {
    acc[i.kind] = (acc[i.kind] ?? 0) + 1;
    return acc;
  }, {});

  const parts = Object.entries(counts)
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");

  return parts.length > 0
    ? `[${task}] 검증 이슈 감지 (${parts})`
    : `[${task}] 검증 이슈 없음`;
}

function decideNextStep(
  task: TaskKind,
  missing: boolean,
  safeToGenerateFix: boolean,
  message: string
): VerifierOutput["nextStep"] {
  if (missing) {
    return {
      action: "REQUEST_MORE_CONTEXT",
      note:
        task === "CODE_REVIEW"
          ? "리뷰 대상 코드(최소 파일/함수 단위)가 필요합니다."
          : "에러 로그 + 재현 방법 + 관련 코드가 필요합니다.",
    };
  }

  if (task === "CODE_REVIEW") {
    return {
      action: "READY_TO_REVIEW",
      note: "이제 문제 지점 지적 및 개선 제안이 가능합니다.",
    };
  }

  if (task === "TYPE_ERROR_FIX" || task === "RUNTIME_ERROR_FIX") {
    return safeToGenerateFix
      ? {
          action: "READY_TO_GENERATE_PATCH",
          note: "필요 컨텍스트가 충분합니다. 이제 patch 생성 단계로 갈 수 있습니다.",
        }
      : {
          action: "READY_TO_FIX",
          note: "에러 분류는 되었으나 patch 생성에 필요한 정보가 더 있을 수 있습니다.",
        };
  }

  // 기타
  if (/(diff|패치|고쳐|fix)/i.test(message)) {
    return { action: "READY_TO_GENERATE_PATCH" };
  }

  return { action: "READY_TO_REVIEW" };
}
