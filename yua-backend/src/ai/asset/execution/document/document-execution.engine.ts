// 📂 src/ai/asset/execution/document/document-execution.engine.ts
// 🔥 DocumentExecutionEngine — PHASE 4.3 (FORMAT + FALLBACK + SCORE-QUALITY)

import type {
  AssetExecutionContext,
  AssetExecutionResult,
} from "../asset-execution.types";

import { buildDocumentAST } from "./document-ast-builder";
import { renderPDF } from "./document-pdf.engine";
import { renderDOCX } from "./document-docx.engine";
import { convertDocxToHwp } from "./document-hwp.engine";
import { runDocumentQualityGate } from "./quality-gate";
import { writeCanonicalJSON } from "../../storage/canonical-storage";

export type DocumentOutputFormat = "PDF" | "DOCX" | "HWP";

/* --------------------------------------------------
 * Quality Thresholds (SSOT)
 * -------------------------------------------------- */

const HARD_SCORE_THRESHOLD = 50;
const SOFT_SCORE_THRESHOLD = 75;

export class DocumentExecutionEngine {
  readonly engineName = "DOCUMENT";

  async execute(
    ctx: AssetExecutionContext & {
      outputFormat?: DocumentOutputFormat;
    }
  ): Promise<AssetExecutionResult> {
    const { assetId, version, input } = ctx;
    const outputFormat = ctx.outputFormat ?? "PDF";

    if (typeof input !== "string" || !input.trim()) {
      throw new Error("DOCUMENT_INPUT_EMPTY");
    }

    /* --------------------------------------------------
     * 1️⃣ AST 생성
     * -------------------------------------------------- */

    const ast = buildDocumentAST(input);
    if (!ast.nodes.length) {
      throw new Error("DOCUMENT_AST_EMPTY");
    }

    /* --------------------------------------------------
     * 2️⃣ Canonical AST 저장
     * -------------------------------------------------- */

    await writeCanonicalJSON({
      assetId,
      version,
      filename: "document.ast.json",
      data: ast,
    });

    /* --------------------------------------------------
     * 3️⃣ Render (FORMAT + FALLBACK)
     * -------------------------------------------------- */

    let outputPath: string;

    const metadata: {
      format: string;
      qualityScore?: number;
      qualityWarnings?: string[];
      fallback?: string;
      hwpConvertError?: string;
      [key: string]: any;
    } = {
      format: outputFormat,
    };

    if (outputFormat === "PDF") {
      outputPath = `storage/assets/${assetId}/v${version}/output.pdf`;
      await renderPDF({ ast, outputPath });
    } else if (outputFormat === "DOCX") {
      outputPath = `storage/assets/${assetId}/v${version}/output.docx`;
      await renderDOCX({ ast, outputPath });
    } else {
      const docxPath =
        `storage/assets/${assetId}/v${version}/output.docx`;
      outputPath =
        `storage/assets/${assetId}/v${version}/output.hwp`;

      await renderDOCX({ ast, outputPath: docxPath });

      try {
        await convertDocxToHwp({
          docxPath,
          hwpPath: outputPath,
        });
      } catch (e) {
        outputPath = docxPath;
        metadata.fallback = "DOCX";
        metadata.hwpConvertError = String(e);
      }
    }

    /* --------------------------------------------------
     * 4️⃣ Quality Gate (SCORE BASED)
     * -------------------------------------------------- */

    const quality = runDocumentQualityGate({
      ast,
      outputPath,
    });

    metadata.qualityScore = quality.score;

    if (quality.score < HARD_SCORE_THRESHOLD || quality.hardFail) {
      throw new Error(
        `DOCUMENT_QUALITY_HARD_FAIL:${quality.reasons?.join(",")}`
      );
    }

    if (
      quality.score < SOFT_SCORE_THRESHOLD ||
      quality.softFail
    ) {
      metadata.qualityWarnings = quality.reasons;
    }

    /* --------------------------------------------------
     * 5️⃣ SUCCESS
     * -------------------------------------------------- */

    return {
      assetId,
      version,
      status: "SUCCESS",
      contentRef: outputPath,
      metadata: {
        ...metadata,
        pageCount: ast.nodes.length,
      },
      costUsedUSD: 0,
      executionTimeMs: 0,
    };
  }
}
