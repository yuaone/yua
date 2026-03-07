// 📂 src/middleware/moderator.ts

import { InputFirewall } from "../ai/security/input-firewall";
import { SemanticIntentGuard } from "../ai/security/semantic-intent-guard";
import { ThreatClassifier } from "../ai/security/threat-classifier";
import { TokenSafety } from "../ai/safety/token-safety";
import { DomainSafety } from "../ai/safety/domain-safety";
import { SecurityMemory } from "../ai/security/security-memory";

export const Moderator = {
  async validate(rawInput: unknown, userId: string = "unknown") {
    const start = Date.now();

    if (!rawInput || typeof rawInput !== "string") {
      return { ok: false, stage: "input", reason: "INVALID_INPUT" };
    }

    const input = rawInput.normalize("NFC").trim();
    if (!input) {
      return { ok: false, stage: "input", reason: "EMPTY_INPUT" };
    }

    const fw = InputFirewall.check(input);
    if (!fw.ok) {
      SecurityMemory.log({ type: "firewall_block", userId, reason: fw.reason });
      return { ok: false, stage: "firewall", reason: fw.reason };
    }

    const intent = SemanticIntentGuard.detect(input);
    if (!intent.ok) {
      return { ok: false, stage: "semantic", reason: intent.reason };
    }

    try {
      const threat = await ThreatClassifier.classify(input);
      if (!threat.ok) {
        return { ok: false, stage: "threat", reason: threat.type };
      }
    } catch {}

    const tokenSafety = await TokenSafety.stabilizeInput(input, {
      stream: false,
    });
    if (tokenSafety.status === "OVERFLOW") {
      return { ok: false, stage: "token", reason: "TOKEN_OVERFLOW" };
    }

    const domainIssues = DomainSafety.validateRequest(input);
    if (domainIssues.length > 0) {
      return { ok: false, stage: "domain", reason: domainIssues[0] };
    }

    SecurityMemory.log({
      type: "moderator_pass",
      userId,
      latency: Date.now() - start,
    });

    return { ok: true, latency: Date.now() - start };
  },
};
