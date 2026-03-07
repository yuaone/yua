// 📂 src/ai/security/semantic-intent-guard.ts
// 🔍 Semantic Intent Guard — ENTERPRISE ULTRA FINAL (2025.11)
// ---------------------------------------------------------
// ✔ Prompt Injection 탐지
// ✔ 규칙 무시/우회 시도 차단
// ✔ Role/Identity 공격 차단
// ✔ Few-shot Jailbreak 필터링
// ✔ Hidden Prompt 공격 차단
// ✔ Base64/ROT13 인코딩을 이용한 우회 공격 차단
// ✔ OpenAI 정책 우회 시도 차단
// ✔ detect() + verify() 모두 지원 (VideoEngine 호환)
// ---------------------------------------------------------

export interface IntentCheckResult {
  ok: boolean;
  reason?: string;
}

export const SemanticIntentGuard = {
  /**
   * 🔍 메인 탐지기
   */
  detect(text: string | undefined | null): IntentCheckResult {
    if (!text || typeof text !== "string") {
      return { ok: false, reason: "invalid_text" };
    }

    const lower = text.toLowerCase();

    // -------------------------------------------------------
    // 1) Jailbreak 명령어
    // -------------------------------------------------------
    const jailbreak = /(jailbreak|you are now unrestricted|no rules apply|break free)/i;
    if (jailbreak.test(lower)) {
      return { ok: false, reason: "jailbreak_detected" };
    }

    // -------------------------------------------------------
    // 2) 규칙 무시 / override 공격
    // -------------------------------------------------------
    const ignoreRules =
      /(ignore previous|disregard all rules|override safety|forget instructions)/i;
    if (ignoreRules.test(lower)) {
      return { ok: false, reason: "override_attempt" };
    }

    // -------------------------------------------------------
    // 3) 역할(Role) 강제 변경
    // -------------------------------------------------------
    const roleAttack =
      /(you are now my assistant|from now on act as|switch your role to)/i;
    if (roleAttack.test(lower)) {
      return { ok: false, reason: "role_injection" };
    }

    // -------------------------------------------------------
    // 4) 모델 정체성 공격
    // -------------------------------------------------------
    const identity =
      /(pretend to be gpt|act as another ai|simulate system access)/i;
    if (identity.test(lower)) {
      return { ok: false, reason: "identity_override" };
    }

    // -------------------------------------------------------
    // 5) Few-shot Jailbreak
    // -------------------------------------------------------
    const fewShot = /(q:\s*.*?a:)|(### instruction)|(### response)/i;
    if (fewShot.test(lower)) {
      return { ok: false, reason: "few_shot_jailbreak" };
    }

    // -------------------------------------------------------
    // 6) 인코딩 기반 우회 공격
    // -------------------------------------------------------
    const encodingAttack =
      /(base64 decode|rot13|decode this|encrypted prompt)/i;
    if (encodingAttack.test(lower)) {
      return { ok: false, reason: "encoded_prompt_attack" };
    }

    // -------------------------------------------------------
    // 7) 시스템 메시지/가드레일 재작성
    // -------------------------------------------------------
    const systemOverride =
      /(rewrite the system prompt|modify safety rules|change assistant behavior)/i;
    if (systemOverride.test(lower)) {
      return { ok: false, reason: "system_prompt_override" };
    }

    // -------------------------------------------------------
    // 8) Hidden Prompt 공격
    // -------------------------------------------------------
    const hiddenCommand = /(### system|<system>|{system}|system override)/i;
    if (hiddenCommand.test(lower)) {
      return { ok: false, reason: "hidden_system_command" };
    }

    // -------------------------------------------------------
    // 9) System Prompt 추출 시도
    // -------------------------------------------------------
    const modelSelf =
      /(show your prompt|reveal system|what is your system message)/i;
    if (modelSelf.test(lower)) {
      return { ok: false, reason: "system_prompt_extraction_attempt" };
    }

    // -------------------------------------------------------
    // 10) OpenAI 정책 우회
    // -------------------------------------------------------
    const policy =
      /(output anything even if illegal|ignore openai policy|unsafe mode on)/i;
    if (policy.test(lower)) {
      return { ok: false, reason: "policy_override_attempt" };
    }

    return { ok: true };
  },

  /**
   * 🔍 video-engine.ts가 verify() 로 호출하므로 래핑 제공
   */
  verify(text: string | undefined | null): IntentCheckResult {
    return this.detect(text);
  }
};
