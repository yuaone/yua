// 📊 Persona Telemetry — PRODUCTION
// 목적:
// - Persona 적용 여부 단일 로그 포맷
// - QA / 운영 디버깅 핵심 지표

import type { PersonaContext } from "../persona/persona-context.types";

export function logPersonaApplied(params: {
  traceId: string;
  personaContext?: PersonaContext;
}) {
  const { traceId, personaContext } = params;

  if (!personaContext) {
    console.log("[DEBUG][PERSONA_APPLIED]", {
      traceId,
      applied: false,
    });
    return;
  }

  const { permission, behavior } = personaContext;

  console.log("[DEBUG][PERSONA_APPLIED]", {
    traceId,
    applied: true,
    allowNameCall: permission.allowNameCall,
    allowPersonalTone: permission.allowPersonalTone,
    source: permission.source,
    persona: behavior?.persona,
    confidence: behavior?.confidence,
  });
}
