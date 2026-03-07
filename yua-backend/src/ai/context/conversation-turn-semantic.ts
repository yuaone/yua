// -----------------------------------------------------------
// ✔ deterministic (LLM ❌)
// ✔ side-effect ❌
// ✔ semantic + relation 분리
// ✔ "이어짐"을 추론하지 않고 표시만 함
// ✔ ContextRuntime / DEEP Reformulation의 유일한 입력 재료
// -----------------------------------------------------------

export type TurnSemanticType =
  | "CONTEXTUAL_FACT"   // 전제 / 조건 / 제약 / 정정 / 암묵적 사실
  | "EXPLORATORY"       // 탐색 / 질문 / 후속 질문
  | "SOCIAL_NOISE";     // 리액션 / 군더더기 / 흐름 제어

export type TurnRole = "user" | "assistant";

export type TurnRelation = {
  dependsOnPrev: boolean;
  relationType?: "FOLLOW_UP" | "REACTION" | "INDEPENDENT";
};

export type SemanticTurn = {
  role: TurnRole;
  content: string;
  semantic: TurnSemanticType;
  relation: TurnRelation;
};

/* ===================================================
   Public API
================================================== */

export function classifyConversationTurns(
  turns: Array<{ role: TurnRole; content: string }>
): SemanticTurn[] {
  const normalized = turns.map(t => ({
    role: t.role,
    content: normalize(t.content),
  }));

  return normalized.map((t, idx) => {
    const prev = idx > 0 ? normalized[idx - 1] : undefined;

    const semantic = classifySemantic({
      role: t.role,
      text: t.content,
      isLast: idx === normalized.length - 1,
    });

    const relation = classifyRelation({
      text: t.content,
      semantic,
      prevText: prev?.content,
      prevSemantic: prev
        ? classifySemantic({ role: prev.role, text: prev.content })
        : undefined,
    });

    return {
      role: t.role,
      content: t.content,
      semantic,
      relation,
    };
  });
}

/* ===================================================
   Semantic Classification
================================================== */

function classifySemantic(args: {
  role: TurnRole;
  text: string;
  isLast?: boolean;
}): TurnSemanticType {
  const { role, text, isLast } = args;

  if (!text) return "SOCIAL_NOISE";

  // 0) Pure noise
  if (isPureNoise(text)) return "SOCIAL_NOISE";

  // 1) Very short utterances
  if (isVeryShort(text)) {
    if (looksLikeConstraint(text)) return "CONTEXTUAL_FACT";
    if (looksLikeQuestion(text)) return "EXPLORATORY";
    return "SOCIAL_NOISE";
  }

  // 2) Explicit constraints / preferences / corrections
  if (looksLikeConstraint(text) || looksLikeCorrection(text)) {
    return "CONTEXTUAL_FACT";
  }

  // 3) Questions
  if (looksLikeQuestion(text)) {
    return "EXPLORATORY";
  }

  // 4) Default handling
  if (role === "user") {
    // 사용자 발언은 기본적으로 잠재 전제
    return "CONTEXTUAL_FACT";
  }

   // 🔒 SSOT:
  // assistant 발화는 의미 carry 대상이 아님
  // continuation / semantic 추론 금지
  return "SOCIAL_NOISE";
}

/* ===================================================
   Relation Classification (NO MEANING CREATION)
================================================== */

function classifyRelation(args: {
  text: string;
  semantic: TurnSemanticType;
  prevText?: string;
  prevSemantic?: TurnSemanticType;
}): TurnRelation {
  const { text, semantic, prevText, prevSemantic } = args;

  if (!prevText) {
    return { dependsOnPrev: false, relationType: "INDEPENDENT" };
  }

  // 1) Reaction / acknowledgement
  if (semantic === "SOCIAL_NOISE") {
    return { dependsOnPrev: true, relationType: "REACTION" };
  }

  // 1.5) Implicit "why?" follow-up (SSOT)
  if (
    semantic === "EXPLORATORY" &&
    prevSemantic !== "SOCIAL_NOISE" &&
    isWhyFollowUp(text)
  ) {
    return { dependsOnPrev: true, relationType: "FOLLOW_UP" };
  }

  // 2) Explicit follow-up markers
  if (startsWithFollowUpCue(text)) {
    return { dependsOnPrev: true, relationType: "FOLLOW_UP" };
  }

  if (
  semantic === "EXPLORATORY" &&
  prevSemantic !== "SOCIAL_NOISE" &&
  (
    /(그|이|저)\s*(부분|방식|구조|조건|이야기|내용)/.test(text) ||
    /^(다른|또|추가|계속)/.test(text) ||
    text.length <= 10
  )
) {
  return { dependsOnPrev: true, relationType: "FOLLOW_UP" };
}

  return { dependsOnPrev: false, relationType: "INDEPENDENT" };
}

/* ===================================================
   Heuristics (Deterministic, Minimal)
================================================== */

function normalize(input: string): string {
  return (
    (input ?? "")
      .replace(/\u0000/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim()
  );
}

function isVeryShort(text: string): boolean {
  return text.length <= 8;
}

function isPureNoise(text: string): boolean {
  if (/^[!?.…]+$/.test(text)) return true;
  if (/^(ㅋ|ㅎ|ㅠ|ㅜ){2,}$/i.test(text.replace(/\s/g, ""))) return true;
  if (isAcknowledgement(text) && text.length <= 6) return true;
  return false;
}

function isAcknowledgement(text: string): boolean {
  return /^(ㅇㅇ|ㅇㅋ|응|그래|좋아|알겠|ok|okay|yep|yeah)$/i.test(
    text.replace(/\s/g, "")
  );
}

function startsWithFollowUpCue(text: string): boolean {
  return /^(그럼|그러면|그래서|그런데|그러니까|그건|이건|저건|다른|또|추가로)/i.test(
    text
  );
}

function looksLikeQuestion(text: string): boolean {
  if (/[?？]$/.test(text)) return true;

  return /(뭐|뭔|왜|어떻게|어때|어떤|가능|될까|추천|비교|알려줘|골라)/i.test(
    text
  );
}

function looksLikeConstraint(text: string): boolean {
  // numbers / limits
  if (/\d/.test(text) && /(원|만원|달러|시간|까지|이내)/i.test(text))
    return true;

  // preferences / exclusions
  if (/(좋아|싫어|원해|선호|피해|제외|빼고|만|필수)/i.test(text))
    return true;

  // topic-style constraint ("고기는", "매운 건")
  if (/^[가-힣]{1,6}(은|는)?$/.test(text)) return true;

  return false;
}

function looksLikeCorrection(text: string): boolean {
  return /(아니|아냐|정정|그게 아니라|수정)/i.test(text);
}

function isWhyFollowUp(text: string): boolean {
  return /^(왜|왜요|왜지|\?)$/i.test(text.trim());
}