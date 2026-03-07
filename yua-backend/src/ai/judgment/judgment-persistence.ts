// src/ai/judgment/judgment-persistence.ts
// 🔒 SSOT: Judgment Rule Persistence (FINAL SAFE)

import fs from "fs";
import path from "path";
import { JudgmentRule } from "./judgment-rule";
import { judgmentRegistry } from "./judgment-singletons";

const FILE_PATH = path.resolve(
  process.cwd(),
  "data/judgment-rules.json"
);

export function saveJudgmentRules(): void {
  const rules = judgmentRegistry.getAll();

  fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
  fs.writeFileSync(
    FILE_PATH,
    JSON.stringify(rules, null, 2),
    "utf-8"
  );
}

export function loadJudgmentRules(): void {
  if (!fs.existsSync(FILE_PATH)) return;

  try {
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    const rules: JudgmentRule[] = JSON.parse(raw);

    for (const rule of rules) {
      if (!rule.id || !rule.triggerHint) continue;

      judgmentRegistry.add({
        ...rule,
        confidence: Math.max(0, rule.confidence),
        decay: Math.max(0, rule.decay ?? 0.01),
      });
    }
  } catch (err) {
    console.error("[JudgmentPersistence] load failed:", err);
  }
}
