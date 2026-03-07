// 📂 src/ai/guardrails/policy.guard.ts
// =====================================================
//  YUA ONE — Enterprise Policy Guard (SSOT FINAL)
//  - GuardrailManager 스타일과 동일한 validate() 형태 유지
// =====================================================

import type { PolicyContext, PolicyDecision } from "../../types/policy-types";

export class PolicyGuard {
  /**
   * 기존 다른 guard들과 형태 통일
   */
  static check(input: string, ctx?: PolicyContext): PolicyDecision {
    return this.validate(input, ctx);
  }

  /**
   * ✅ Enterprise 정책 레이어
   * - 현재는 “스켈레톤 + 필수 안전 규칙”만 고정
   * - 이후 STEP 1/2/3/4에서 instanceId / tier / engine binding 기반으로 강화됨
   */
  static validate(input: string, ctx?: PolicyContext): PolicyDecision {
    // ---------------------------------------------------
    // 0) 최소 컨텍스트 검증 (SSOT)
    // ---------------------------------------------------
    const instanceId = (ctx?.instanceId ?? "").trim();

    // STEP 6 기준: enterprise layer에서 instanceId 없으면 정책 적용 불가 → 차단
    // (나중에 guest/public route는 예외로 열 수 있지만, 지금은 SSOT로 “강제”)
    if (!instanceId) {
      return {
        ok: false,
        warning: "instanceId가 누락되었습니다. (Enterprise Policy Layer)",
        code: "INSTANCE_ID_REQUIRED",
        source: "policy",
      };
    }

    // ---------------------------------------------------
    // 1) 기본 블록 규칙 (예: 정책적으로 금지할 키워드/행위)
    // ---------------------------------------------------
    // 너무 무겁게 만들지 말고, 지금은 '뼈대' + 고정 규칙만.
    const lower = String(input ?? "").toLowerCase();

    // 예: 관리자급 기능/보안 민감 기능은 enterprise/superadmin만 허용(스켈레톤)
    // 실제 role 판정은 AuthContext/KeyManager 연결되면 강화.
    const role = ctx?.userRole ?? "guest";
    const sensitiveOps = ["root", "sudo", "권한상승", "privilege escalation"];

    if (sensitiveOps.some((k) => lower.includes(k))) {
      if (role !== "enterprise" && role !== "superadmin") {
        return {
          ok: false,
          warning: "민감 작업은 enterprise 권한에서만 허용됩니다.",
          code: "ROLE_REQUIRED_ENTERPRISE",
          source: "policy",
        };
      }
    }

    // ---------------------------------------------------
    // 2) 통과
    // ---------------------------------------------------
    return { ok: true };
  }
}
