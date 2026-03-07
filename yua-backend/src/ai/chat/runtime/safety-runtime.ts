import { SafetyEngine } from "../../engines/safety-engine";

/* -------------------------------------------------- */
/* 🔒 Global Safety Runtime — SSOT FINAL              */
/* -------------------------------------------------- */

type GlobalSafetyBlocked = {
  ok: false;
  blocked: true;
  category: string;
  reason: string; // 🔒 HARD BLOCK 시 필수
  policy: {
    allowSearch: false;
    allowMemory: false;
  };
};

type GlobalSafetyAllowed = {
  ok: true;
  blocked: false;
  policy: {
    allowSearch: true;
    allowMemory: true;
  };
};

export type GlobalSafetyResult =
  | GlobalSafetyBlocked
  | GlobalSafetyAllowed;

export function runGlobalSafetyRuntime(args: {
  input: string;
  personaRole: string;
  reasoning: any;
}): GlobalSafetyResult {
  const result = SafetyEngine.analyzeUnsafe(args.input);

  // ❌ HARD BLOCK — reason 필수 보장
  if (!result.ok) {
    return {
      ok: false,
      blocked: true,
      category: result.category ?? "unknown",
      reason:
        result.reason ??
        "Blocked by global safety policy",
      policy: {
        allowSearch: false,
        allowMemory: false,
      },
    };
  }

  // ✅ SAFE
  return {
    ok: true,
    blocked: false,
    policy: {
      allowSearch: true,
      allowMemory: true,
    },
  };
}

/* -------------------------------------------------- */
/* 🔒 Responsibility Safety Runtime (DEEP ONLY)      */
/* -------------------------------------------------- */

export function runResponsibilitySafetyRuntime(args: {
  reasoning: {
    confidence: number;
    domain?: string;
  };
}): {
  restrictAnswer: boolean;
  constraints?: string[];
} {
  if (
    args.reasoning.confidence < 0.5 &&
    ["law", "finance", "medical"].includes(
      String(args.reasoning.domain)
    )
  ) {
    return {
      restrictAnswer: true,
      constraints: ["low_confidence_sensitive_domain"],
    };
  }

  return {
    restrictAnswer: false,
  };
}
