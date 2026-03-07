// 📂 src/ai/safety/domain-safety.ts
// 🔥 YUA-AI — Domain Safety Engine (2025.11 UPGRADE FINAL)
// -------------------------------------------------------------
// ✔ 기존 기능 100% 유지
// ✔ 세무/회계/보안/개발/법무/AI 아키텍처 도메인 필터 강화
// ✔ Advisor + Workflow + ReportEngine 완전 호환
// -------------------------------------------------------------

import { AdvisorDomain } from "../advisor/advisor-types";

export const DomainSafety = {
  // ---------------------------------------------------------
  // 🧠 도메인 자동 감지
  // ---------------------------------------------------------
  detectDomain(text: string): AdvisorDomain {
    const msg = (text || "").toLowerCase();

    if (msg.includes("세무") || msg.includes("회계") || msg.includes("소득")) {
      return "tax_accounting";
    }

    if (
      msg.includes("위험") ||
      msg.includes("보안") ||
      msg.includes("침해") ||
      msg.includes("해킹")
    ) {
      return "security_risk";
    }

    if (
      msg.includes("설계도") ||
      msg.includes("architecture") ||
      msg.includes("아키텍처") ||
      msg.includes("구조도")
    ) {
      return "system_architecture";
    }

    if (
      msg.includes("코드") ||
      msg.includes("개발") ||
      msg.includes("빌드") ||
      msg.includes("컴파일")
    ) {
      return "software_engineering";
    }

    if (msg.includes("법") || msg.includes("불법") || msg.includes("위반")) {
      return "legal";
    }

    return "general";
  },

  // ---------------------------------------------------------
  // 🦺 기본 안전 검증
  // ---------------------------------------------------------
  validateRequest(text: string): string[] {
    const issues: string[] = [];
    const msg = (text || "").toLowerCase();

    // ⚠️ 세무/회계 탈세 위험
    if (msg.includes("탈세") || msg.includes("절세 꼼수")) {
      issues.push("세무/회계 불법 요소 감지됨 (탈세/편법)");
    }

    // ⚠️ 취약점/우회/해킹
    if (
      msg.includes("우회") ||
      msg.includes("취약점") ||
      msg.includes("해킹") ||
      msg.includes("백도어")
    ) {
      issues.push("보안 취약점/우회 시도 가능성");
    }

    // ⚠️ jailbreak / system prompt 탈취
    if (
      msg.includes("system prompt") ||
      msg.includes("jailbreak") ||
      msg.includes("탈옥") ||
      msg.includes("프롬프트 보여줘")
    ) {
      issues.push("AI base prompt 탈취 시도 가능성");
    }

    return issues;
  },

  // ---------------------------------------------------------
  // 🧠 안전 모드 안내문 생성
  // ---------------------------------------------------------
  buildSafetyNotice(issues: string[]): string {
    if (issues.length === 0) return "";

    return `
⚠️ [도메인 안전 필터 발동]
다음 위험 요소가 감지되었습니다:
${issues.map((i) => `- ${i}`).join("\n")}

YUA-AI는 관련 법령 및 윤리 기준을 준수하며,
위험도가 높은 요청은 조언을 제한하거나 안전한 대안을 제공합니다.
    `.trim();
  },
};
