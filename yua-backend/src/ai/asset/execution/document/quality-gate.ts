// 🔒 Document Quality Gate — PHASE 4.3 (SCORE-BASED, FORMAT AGNOSTIC)

import fs from "fs";
import type { DocumentAST } from "./document-canonical.types";

/* --------------------------------------------------
 * Quality Report
 * -------------------------------------------------- */

export interface DocumentQualityReport {
  /** 실행 성공 여부 (hardFail 없으면 true) */
  passed: boolean;

  /** 0 ~ 100 품질 점수 */
  score: number;

  /** 즉시 실패 (EXECUTION FAILED) */
  hardFail?: boolean;

  /** 성공은 하나 경고로 기록 */
  softFail?: boolean;

  reasons?: string[];
}

/* --------------------------------------------------
 * Quality Gate Entry
 * -------------------------------------------------- */

export function runDocumentQualityGate(params: {
  ast: DocumentAST;
  outputPath: string; // PDF / DOCX / HWP 공통
}): DocumentQualityReport {
  const { ast, outputPath } = params;

  const reasons: string[] = [];
  let hardFail = false;
  let softFail = false;

  // 기본 점수
  let score = 100;

  /* --------------------------------------------------
   * AST 존재 (HARD)
   * -------------------------------------------------- */

  if (!ast.nodes?.length) {
    reasons.push("AST_EMPTY");
    hardFail = true;
    score = 0;
  }

  /* --------------------------------------------------
   * Heading 구조 평가 (SOFT)
   * -------------------------------------------------- */

  const headingLevels = ast.nodes
    .filter((n) => n.type === "heading")
    .map((n) => n.level ?? 1);

  const maxHeading = headingLevels.length
    ? Math.max(...headingLevels)
    : 0;

  if (maxHeading > 4) {
    reasons.push("HEADING_TOO_DEEP");
    softFail = true;
    score -= 15;
  }

  /* --------------------------------------------------
   * Paragraph 밀도 평가 (HARD / SOFT)
   * -------------------------------------------------- */

  const paragraphCount = ast.nodes.filter(
    (n) => n.type === "paragraph"
  ).length;

  if (paragraphCount < 2) {
    reasons.push("PARAGRAPH_TOO_FEW");
    hardFail = true;
    score -= 50;
  } else if (paragraphCount < 4) {
    reasons.push("PARAGRAPH_SPARSE");
    softFail = true;
    score -= 10;
  }

  /* --------------------------------------------------
   * 문서 구조 다양성 (SOFT)
   * -------------------------------------------------- */

  const hasList = ast.nodes.some((n) => n.type === "list");
  const hasQuote = ast.nodes.some((n) => n.type === "quote");

  if (!hasList && !hasQuote) {
    reasons.push("LOW_STRUCTURE_VARIETY");
    softFail = true;
    score -= 10;
  }

  /* --------------------------------------------------
   * Output 파일 존재 (HARD)
   * -------------------------------------------------- */

  if (!fs.existsSync(outputPath)) {
    reasons.push("OUTPUT_NOT_CREATED");
    hardFail = true;
    score = 0;
  }

  /* --------------------------------------------------
   * Score 정규화
   * -------------------------------------------------- */

  score = Math.max(0, Math.min(100, score));

  const passed = !hardFail;

  return {
    passed,
    score,
    hardFail: hardFail || undefined,
    softFail: !hardFail && softFail ? true : undefined,
    reasons: reasons.length ? reasons : undefined,
  };
}
