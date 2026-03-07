import { LegalGuard } from "./legal.guard";
import { FinanceGuard } from "./finance.guard";
import { PrivacyGuard } from "./privacy.guard";
import { SafetyGuard } from "./safety.guard";

export interface GuardrailResult {
  blocked: boolean;
  reason?: string;
  source?: string;
}

export interface GuardrailContext {
  instanceId?: string;
  tier?: "basic" | "pro" | "business" | "enterprise";
  engine?: string;
}

export class GuardrailManager {
  static analyze(content: string, ctx?: GuardrailContext): GuardrailResult {
    const legal = LegalGuard.validate(content);
    if (!legal.ok) {
      return {
        blocked: true,
        reason: legal.warning,
        source: "legal",
      };
    }

    const fin = FinanceGuard.validate(content);
    if (!fin.ok) {
      return {
        blocked: true,
        reason: fin.warning,
        source: "finance",
      };
    }

    const privacy = PrivacyGuard.validate(content);
    if (!privacy.ok) {
      return {
        blocked: true,
        reason: privacy.warning,
        source: "privacy",
      };
    }

    const safety = SafetyGuard.validate(content);
    if (!safety.ok) {
      return {
        blocked: true,
        reason: safety.warning,
        source: "safety",
      };
    }

    return { blocked: false };
  }

  static analyzePayload(
    data: any,
    ctx?: GuardrailContext
  ): GuardrailResult {
    try {
      const text = JSON.stringify(data);
      return this.analyze(text, ctx);
    } catch {
      return {
        blocked: true,
        reason: "데이터 JSON 직렬화 실패",
        source: "serialize",
      };
    }
  }

  static enforce(
    content: string,
    ctx?: GuardrailContext
  ): GuardrailResult {
    const r = this.analyze(content, ctx);

    if (r.blocked) {
      return {
        blocked: true,
        reason: `[BLOCKED] ${r.reason}`,
        source: r.source,
      };
    }

    return { blocked: false };
  }

  static scan(
    content: string,
    ctx?: GuardrailContext
  ): { ok: boolean; warning?: string } {
    const r = this.analyze(content, ctx);

    if (r.blocked) {
      return {
        ok: false,
        warning: `[${r.source}] ${r.reason}`,
      };
    }

    return { ok: true };
  }
}
