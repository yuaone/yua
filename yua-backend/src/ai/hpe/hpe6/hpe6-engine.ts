// 📂 src/ai/hpe/hpe6/hpe6-engine.ts
// 🔥 HPE 6.0 — Autonomous Debugger & Patch Engine (FINAL 2025.11)

import { SyntaxDetector } from "./detectors/syntax-detector";
import { TypeDetector } from "./detectors/type-detector";
import { RouteDetector } from "./detectors/route-detector";
import { ProviderDetector } from "./detectors/provider-detector";

import { RepairSuggester } from "./repair/repair-suggester";
import { AutoPatch } from "./repair/auto-patch";

import { HPE6Issue, HPE6Output } from "./hpe6-protocol";

// ------------------------------------------------------------
// 🔧 severity normalizer
// detector들이 반환하는 string severity → HPE6Issue severity 로 변환
// ------------------------------------------------------------
function normalizeSeverity(raw: string): "low" | "medium" | "high" {
  const s = raw.toLowerCase();

  if (["critical", "fatal", "error"].includes(s)) return "high";
  if (["warn", "warning"].includes(s)) return "medium";

  return "low";
}

// ------------------------------------------------------------
// 🔧 issue normalizer
// detectors 결과(any)를 HPE6Issue로 형태 통일 + severity 변환
// ------------------------------------------------------------
function normalizeIssues(list: any[]): HPE6Issue[] {
  return list.map((issue) => ({
    type: issue.type ?? "unknown",
    file: issue.file ?? "",
    detail: issue.detail ?? "",
    severity: normalizeSeverity(issue.severity ?? "low")
  }));
}

// ------------------------------------------------------------
// 🧠 runHPE6 — FINAL VERSION
// ------------------------------------------------------------
export async function runHPE6(
  fileContent: string,
  fileName: string
): Promise<HPE6Output> {

  let issues: HPE6Issue[] = [];

  // 1) Syntax
  const syntaxIssues = normalizeIssues(
    SyntaxDetector(fileContent, fileName)
  );
  issues = issues.concat(syntaxIssues);

  // 2) TS Type
  const typeIssues = normalizeIssues(
    TypeDetector(fileContent, fileName)
  );
  issues = issues.concat(typeIssues);

  // 3) Route
  const routeIssues = normalizeIssues(
    RouteDetector(fileContent, fileName)
  );
  issues = issues.concat(routeIssues);

  // 4) Provider
  const providerIssues = normalizeIssues(
    ProviderDetector(fileContent, fileName)
  );
  issues = issues.concat(providerIssues);

  // 5) Patch Candidates
  const suggestPatches = RepairSuggester(issues);
  const autoPatches = AutoPatch(issues);

  return {
    ok: true,
    issues,
    patches: [...suggestPatches, ...autoPatches]
  };
}
