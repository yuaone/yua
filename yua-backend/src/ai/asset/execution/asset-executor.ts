// 🔒 AssetExecutor — PHASE 4.4 (SSOT SAFE, ERROR AWARE)

import type {
  AssetExecutionRequest,
  AssetExecutionResult,
} from "./asset-execution.types";

import { AssetRegistryRepo } from "../registry/asset-registry.repo";
import { AssetExecutionRunner } from "./asset-execution-runner";

const runner = new AssetExecutionRunner();

export class AssetExecutor {
  async run(
    req: AssetExecutionRequest
  ): Promise<AssetExecutionResult> {
    if (req.judgmentVerdict !== "APPROVE") {
      throw new Error("execution_blocked_by_judgment");
    }

    // 1️⃣ version 확보 (실패해도 version은 소비됨 = SSOT)
    const version = await AssetRegistryRepo.beginExecution({
      assetId: req.assetId,
      canonicalFormat: req.canonicalFormat,
      outputFormat: req.canonical?.outputFormat,
      userId: req.requestedByUserId,
      traceId: req.traceId,
    });

    try {
      // 2️⃣ 실제 실행
      const result = await runner.execute(req, version);

      // 3️⃣ 비용 초과는 명시적 실패
      if (result.costUsedUSD > req.costLimitUSD) {
        throw new Error("cost_limit_exceeded");
      }

      // 4️⃣ 성공 확정
      await AssetRegistryRepo.finalizeExecution(
        result,
        req.traceId
      );

      return result;
    } catch (e: any) {
      const reason =
        typeof e?.message === "string"
          ? e.message
          : "execution_failed";

      // 5️⃣ 실패도 반드시 기록 (SSOT)
      await AssetRegistryRepo.failExecution({
        assetId: req.assetId,
        version,
        reason,
        traceId: req.traceId,
      });

      /**
       * 🔒 에러 재던지기 규칙
       * - 품질 실패 / 비용 초과 → 그대로 전달
       * - 나머지 → execution_failed
       */
      if (
        reason.startsWith("DOCUMENT_QUALITY_") ||
        reason === "cost_limit_exceeded" ||
        reason === "DOCUMENT_INPUT_EMPTY"
      ) {
        throw e;
      }

      throw new Error("execution_failed");
    }
  }
}
