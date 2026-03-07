// 📂 src/ai/utils/profiler.ts
// 🔥 YUA-AI Profiler — FINAL MASTER VERSION + POLICY LAYER (2025.12)
// ✔ 기존 Persona 구조 100% 유지
// ✔ 권한 레벨(RoleLevel) 및 정책(ProfilePolicy) 추가
// ✔ PromptBuilder / Engine / Guardrail 에서 공용 사용
// ✔ strict mode 100% 통과

import { WorkerProfile } from "../profiles/worker.profile";
import { IndividualProfile } from "../profiles/individual.profile";
import { BusinessProfile } from "../profiles/business.profile";
import { SuperAdminProfile } from "../profiles/super_admin.profile";
import { CorporateProfile } from "../profiles/corporate.profile";
import { CompanyManagerProfile } from "../profiles/company_manager.profile";
import { EmployeeProfile } from "../profiles/employee.profile";
import { AccountingFirmProfile } from "../profiles/accounting_firm.profile";
import { TaxFirmProfile } from "../profiles/tax_firm.profile";
import { TaxAgentProfile } from "../profiles/tax_agent.profile";
import { ExpertProfile } from "../profiles/expert.profile";
import { EngineAdminProfile } from "../profiles/engine_admin.profile";
import { DeveloperConsoleProfile } from "../profiles/developer_console.profile";

/* --------------------------------------------------
 * UserType
 * -------------------------------------------------- */

export type UserTypeKey =
  | "worker"
  | "individual"
  | "business"
  | "sole"
  | "corporate"
  | "company_manager"
  | "employee"
  | "accounting_firm"
  | "tax_firm"
  | "tax_agent"
  | "expert"
  | "engine_admin"
  | "developer_console"
  | "super_admin";

/* --------------------------------------------------
 * Persona Profile (기존 그대로)
 * -------------------------------------------------- */

export interface PersonaProfile {
  role: string;
  tone: string;
  style: {
    greeting: string;
    manner: string;
    restriction: string;
  };
  behavior: {
    focus: string;
    avoid: string[];
  };
}

/* --------------------------------------------------
 * 🔐 Policy Layer (신규)
 * -------------------------------------------------- */

export type RoleLevel = "USER" | "CREATOR" | "ADMIN" | "SUPERADMIN";

export interface ProfilePolicy {
  level: RoleLevel;
  maxDepth: number;      // 응답 깊이 제한
  allowBuild: boolean;  // BUILD / 실행형 응답 허용 여부
}

/* --------------------------------------------------
 * Persona Map (기존 그대로)
 * -------------------------------------------------- */

const PROFILE_MAP: Record<UserTypeKey, PersonaProfile> = {
  worker: WorkerProfile,
  individual: IndividualProfile,
  business: BusinessProfile,
  sole: BusinessProfile,
  corporate: CorporateProfile,
  company_manager: CompanyManagerProfile,
  employee: EmployeeProfile,
  accounting_firm: AccountingFirmProfile,
  tax_firm: TaxFirmProfile,
  tax_agent: TaxAgentProfile,
  expert: ExpertProfile,
  engine_admin: EngineAdminProfile,
  developer_console: DeveloperConsoleProfile,
  super_admin: SuperAdminProfile,
};

/* --------------------------------------------------
 * 🔐 Policy Map (SSOT)
 * -------------------------------------------------- */

const PROFILE_POLICY: Record<UserTypeKey, ProfilePolicy> = {
  worker: { level: "USER", maxDepth: 1, allowBuild: false },
  individual: { level: "USER", maxDepth: 1, allowBuild: false },

  business: { level: "CREATOR", maxDepth: 3, allowBuild: true },
  sole: { level: "CREATOR", maxDepth: 3, allowBuild: true },
  corporate: { level: "CREATOR", maxDepth: 3, allowBuild: true },
  company_manager: { level: "CREATOR", maxDepth: 3, allowBuild: true },
  employee: { level: "CREATOR", maxDepth: 3, allowBuild: true },
  developer_console: { level: "CREATOR", maxDepth: 3, allowBuild: true },

  accounting_firm: { level: "ADMIN", maxDepth: 4, allowBuild: true },
  tax_firm: { level: "ADMIN", maxDepth: 4, allowBuild: true },
  tax_agent: { level: "ADMIN", maxDepth: 4, allowBuild: true },
  expert: { level: "ADMIN", maxDepth: 4, allowBuild: true },
  engine_admin: { level: "ADMIN", maxDepth: 4, allowBuild: true },

  super_admin: { level: "SUPERADMIN", maxDepth: 5, allowBuild: true },
};

/* --------------------------------------------------
 * Profiler
 * -------------------------------------------------- */

export class Profiler {
  /**
   * 🔤 userType 문자열을 표준 UserTypeKey로 정규화
   */
  static normalize(userType?: string | null): UserTypeKey {
    if (!userType) return "individual";

    const raw = String(userType).trim().toLowerCase();

    if (["worker", "employee", "직장인", "근로자", "office", "staff"].includes(raw))
      return "worker";
    if (["individual", "person", "user", "개인"].includes(raw))
      return "individual";

    if (["sole", "biz", "business", "self_employed", "owner", "개인사업자"].includes(raw))
      return "sole";

    if (["corporate", "corp", "company", "enterprise", "startup", "법인"].includes(raw))
      return "corporate";

    if (["company_manager", "manager", "corp_manager", "담당자", "재무담당", "회계담당"].includes(raw))
      return "company_manager";

    if (["tax_firm", "세무법인"].includes(raw))
      return "tax_firm";
    if (["accounting_firm", "회계법인"].includes(raw))
      return "accounting_firm";
    if (["tax_agent", "tax_accountant", "세무사"].includes(raw))
      return "tax_agent";

    if (["expert", "advisor", "consultant", "전문가"].includes(raw))
      return "expert";

    if (["engine_admin", "engineer_admin", "엔진관리자"].includes(raw))
      return "engine_admin";

    if (["developer_console", "dev_console", "developer", "dev", "콘솔", "개발자"].includes(raw))
      return "developer_console";

    if (["super_admin", "superadmin", "root_admin", "관리자"].includes(raw))
      return "super_admin";

    return "individual";
  }

  /**
   * 👤 Persona Profile 로딩 (기존 로직 유지)
   */
  static load(userType?: string | null): PersonaProfile {
    const key = this.normalize(userType);
    return PROFILE_MAP[key] ?? IndividualProfile;
  }

  /**
   * 🔐 Policy 로딩 (신규)
   */
  static loadPolicy(userType?: string | null): ProfilePolicy {
    const key = this.normalize(userType);
    return PROFILE_POLICY[key] ?? PROFILE_POLICY.individual;
  }
}
