// 📂 src/ai/asset/execution/asset-execution-runner.ts
// 🔥 AssetExecutionRunner — PHASE 4.3 (FORMAT SAFE, TIME AWARE)

import type {
  AssetExecutionRequest,
  AssetExecutionResult,
  DocumentOutputFormat,
} from "./asset-execution.types";

import { DocumentExecutionEngine } from "./document/document-execution.engine";
import { ImageGenerationEngine } from "./image/image-generation.engine";
import { VideoScriptEngine } from "./video/video-script.engine";

const documentEngine = new DocumentExecutionEngine();
const imageEngine = new ImageGenerationEngine();
const videoEngine = new VideoScriptEngine();

export class AssetExecutionRunner {
  async execute(
    req: AssetExecutionRequest,
    version: number
  ): Promise<AssetExecutionResult> {
    const start = Date.now();

    switch (req.canonicalFormat.type) {
      case "MARKDOWN_AST": {
        const outputFormat: DocumentOutputFormat =
          req.canonical?.outputFormat ?? "PDF";

        const result = await documentEngine.execute({
          assetId: req.assetId,
          version,

          // ✅ FIX: 실제 실행 입력은 req.input
          input: typeof req.input === "string" ? req.input : undefined,

          canonical: req.canonicalFormat,
          outputFormat,

          createdBy: req.requestedByUserId,
          traceId: req.traceId,
        });

        return {
          ...result,
          executionTimeMs: Date.now() - start,
        };
      }

      case "IMAGE_SPEC": {
        const out = await imageEngine.execute({
          assetId: req.assetId,
          version,
          spec: req.canonicalFormat as any,
        });

        return {
          assetId: req.assetId,
          version,
          status: "SUCCESS",
           contentRef: out.imageUrl,
           metadata: {
   format: "IMAGE_SPEC",
   delivery: "HTTP_URL",
 },
          costUsedUSD: 0,
          executionTimeMs: Date.now() - start,
        };
      }

      case "VIDEO_SCRIPT": {
        const out = await videoEngine.execute({
          assetId: req.assetId,
          version,
          script: req.canonicalFormat,
        });

        return {
          assetId: req.assetId,
          version,
          status: "SUCCESS",
          contentRef: out.scriptPath,
          metadata: { format: "VIDEO_SCRIPT" },
          costUsedUSD: 0,
          executionTimeMs: Date.now() - start,
        };
      }

      default: {
        // 런타임 방어
        const t = (req.canonicalFormat as any)?.type;
        throw new Error(`unsupported_canonical_type:${String(t)}`);
      }
    }
  }
}
