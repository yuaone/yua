// 🧩 Persona Message Wrapper — PRODUCTION READY
// 역할:
// - PersonaContext 기반으로 message를 "살짝" 래핑
// - Prompt 내용 오염 ❌
// - LLM 판단 ❌
// - 한국어 말투/호칭 제어 단일 지점

import type { PersonaContext } from "../../persona/persona-context.types";

export interface PersonaWrapOptions {
  message: string;
  personaContext?: PersonaContext;
  workspaceName?: string;
}

export function wrapMessageWithPersona(
  options: PersonaWrapOptions
): string {
  const { message, personaContext, workspaceName } = options;

  if (!personaContext) return message;

  const { permission, behavior } = personaContext;

  // Judgment 차단 / 익명 → 절대 래핑 안 함
  if (
    permission.allowNameCall !== true &&
    permission.allowPersonalTone !== true
  ) {
    return message;
  }

  let prefix = "";

  // 이름/워크스페이스 호칭
  if (permission.allowNameCall && workspaceName) {
    prefix += `${workspaceName} 기준으로 말할게.\n\n`;
  }

  // 말투 힌트
  if (
    permission.allowPersonalTone &&
    behavior &&
    behavior.confidence >= 0.6
  ) {
    prefix +=
      "조금 더 편하게 설명해도 될 것 같아.\n\n";
  }

  if (!prefix) return message;

  return `${prefix}${message}`;
}
