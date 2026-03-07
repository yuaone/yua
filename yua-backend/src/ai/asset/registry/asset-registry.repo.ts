// 🔒 Asset Registry Repository — SSOT FINAL (VERSION SAFE, TX SAFE)

import { pgPool } from "../../../db/postgres";
import type { CanonicalFormat } from "../planner/asset-planner";
import type { AssetExecutionResult } from "../execution/asset-execution.types";

export class AssetRegistryRepo {
  /* -------------------------------------------------- */
  /* Begin Execution (SSOT VERSION SAFE)                */
  /* -------------------------------------------------- */
  static async beginExecution(params: {
    assetId: string;
    canonicalFormat: CanonicalFormat;
    outputFormat?: string;
    userId: number;
    traceId: string;
  }): Promise<number> {
    const client = await pgPool.connect();

    try {
      await client.query("BEGIN");

      // 1️⃣ version은 assets에서 원자적으로 증가
      const { rows } = await client.query<{
        current_version: number;
      }>(
        `
        UPDATE assets
        SET current_version = current_version + 1,
            updated_at = NOW()
        WHERE id = $1
        RETURNING current_version
        `,
        [params.assetId]
      );

      if (!rows.length) {
        throw new Error("asset_not_found");
      }

      const version = rows[0].current_version;

      // 2️⃣ 해당 version row는 무조건 생성 (성공/실패 공통)
      await client.query(
        `
        INSERT INTO asset_versions (
          asset_id,
          version,
          canonical_type,
          schema_version,
          output_format,
          content_ref,
          created_by,
          quality_score,
          quality_reasons,
          quality_warnings
        )
        VALUES ($1, $2, $3, $4, $5, NULL, $6, NULL, NULL, NULL)
        `,
        [
          params.assetId,
          version,
          params.canonicalFormat.type,
          params.canonicalFormat.schemaVersion,
          params.outputFormat ?? null,
          params.userId,
        ]
      );

      // 3️⃣ CREATE audit
      await client.query(
        `
        INSERT INTO asset_audit_logs (
          asset_id,
          version,
          action,
          actor_user_id,
          meta
        )
        VALUES ($1, $2, 'CREATE', $3, $4)
        `,
        [
          params.assetId,
          version,
          params.userId,
          {
            traceId: params.traceId,
            outputFormat: params.outputFormat,
          },
        ]
      );

      await client.query("COMMIT");
      return version;
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // 이미 abort 상태일 수 있음 → 무시
      }
      throw e;
    } finally {
      client.release();
    }
  }

  /* -------------------------------------------------- */
  /* Finalize Success                                  */
  /* -------------------------------------------------- */
  static async finalizeExecution(
    result: AssetExecutionResult & {
      metadata?: {
        qualityScore?: number;
        qualityWarnings?: string[];
      };
      quality?: {
        score?: number;
        reasons?: string[];
      };
    },
    traceId: string
  ): Promise<void> {
    await pgPool.query(
      `
      UPDATE asset_versions
      SET content_ref = $1,
          quality_score = $2,
          quality_reasons = $3,
          quality_warnings = $4
      WHERE asset_id = $5 AND version = $6
      `,
      [
        result.contentRef,
        result.quality?.score ??
          result.metadata?.qualityScore ??
          null,
        result.quality?.reasons ?? null,
        result.metadata?.qualityWarnings ?? null,
        result.assetId,
        result.version,
      ]
    );

    await pgPool.query(
      `
      INSERT INTO asset_audit_logs (
        asset_id,
        version,
        action,
        actor_user_id,
        meta
      )
      VALUES ($1, $2, 'EXECUTE_SUCCESS', 0, $3)
      `,
      [
        result.assetId,
        result.version,
        {
          traceId,
          costUsedUSD: result.costUsedUSD,
          executionTimeMs: result.executionTimeMs,
          qualityScore:
            result.quality?.score ??
            result.metadata?.qualityScore,
          qualityReasons: result.quality?.reasons,
          qualityWarnings: result.metadata?.qualityWarnings,
        },
      ]
    );
  }

  /* -------------------------------------------------- */
  /* Finalize Failure                                  */
  /* -------------------------------------------------- */
  static async failExecution(params: {
    assetId: string;
    version: number;
    reason: string;
    traceId: string;
  }): Promise<void> {
    await pgPool.query(
      `
      INSERT INTO asset_audit_logs (
        asset_id,
        version,
        action,
        actor_user_id,
        meta
      )
      VALUES ($1, $2, 'EXECUTE_FAILED', 0, $3)
      `,
      [
        params.assetId,
        params.version,
        {
          traceId: params.traceId,
          reason: params.reason,
        },
      ]
    );
  }
}
