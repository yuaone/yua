import type { YuaToolRunRecord, YuaToolRunStatus } from "./yua-tool-run.types";
import type { YuaToolResult } from "yua-shared";
import { pgPool } from "../../db/postgres";

type FindCachedArgs = {
  workspaceId: string;
  task: string;
  inputsHash: string;
  toolVersion: string;
};

function toDate(ms?: number): Date | null {
  if (!ms) return null;
  return new Date(ms);
}

function fromDate(d?: string | Date | null): number | undefined {
  if (!d) return undefined;
  const dt = typeof d === "string" ? new Date(d) : d;
  return Number.isFinite(dt.getTime()) ? dt.getTime() : undefined;
}

function jsonOrNull(v: unknown): any {
  if (v === undefined || v === null) return null;
  return v;
}

export async function createPlanned(record: YuaToolRunRecord): Promise<void> {
  await pgPool.query(
    `
    INSERT INTO public.tool_runs (
      id, trace_id, thread_id, workspace_id,
      task, status,
      inputs_hash, tool_version,
      created_at, started_at, finished_at
    )
    VALUES (
      $1, $2, $3, $4,
      $5, $6,
      $7, $8,
      $9, $10, $11
    )
    `,
    [
      record.id,
      record.traceId,
      record.threadId ?? null,
      record.workspaceId,
      record.task,
      record.status,
      record.inputsHash,
      record.toolVersion,
      toDate(record.createdAt),
      toDate(record.startedAt),
      toDate(record.finishedAt),
    ]
  );
}

export async function markRunning(id: string, startedAt: number): Promise<void> {
  await pgPool.query(
    `
    UPDATE public.tool_runs
    SET status = 'running',
        started_at = COALESCE(started_at, $2)
    WHERE id = $1
    `,
    [id, toDate(startedAt)]
  );
}

async function upsertSources(
  toolRunId: string,
  sources?: { kind: "FILE" | "WEB" | "DB" | "API" | "MEMORY"; ref: string }[]
) {
  if (!sources?.length) return;

  // 멱등성: 같은 kind/ref 중복 삽입 방지하려면 unique index가 필요하지만,
  // 지금은 Phase 초반이라 단순 insert. (추후 UNIQUE(tool_run_id, kind, ref) 추천)
  const values: any[] = [];
  const placeholders: string[] = [];

  sources.forEach((s, i) => {
    const base = i * 3;
    placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
    values.push(toolRunId, s.kind, s.ref);
  });

  await pgPool.query(
    `
    INSERT INTO public.tool_sources (tool_run_id, kind, ref)
    VALUES ${placeholders.join(",")}
    `,
    values
  );
}

export async function markFinished(
  id: string,
  result: YuaToolResult<any>,
  finishedAt: number
): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `
      UPDATE public.tool_runs
      SET status = 'finished',
      inputs_hash = $7,
          output_json = $2,
          provenance_json = $3,
          metrics_json = $4,
          error_json = $5,
          finished_at = $6
      WHERE id = $1
      `,
      [
        id,
        jsonOrNull(result.output),
        jsonOrNull(result.provenance),
        jsonOrNull(result.metrics),
        jsonOrNull(result.error),
        toDate(finishedAt),
        result.provenance.inputsHash
      ]
    );

    // sources 저장
    if (result.provenance?.sources?.length) {
      const sources = result.provenance.sources;
      const values: any[] = [];
      const placeholders: string[] = [];
      sources.forEach((s, i) => {
        const base = i * 3;
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
        values.push(id, s.kind, s.ref);
      });

      await client.query(
        `
        INSERT INTO public.tool_sources (tool_run_id, kind, ref)
        VALUES ${placeholders.join(",")}
        `,
        values
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function markError(
  id: string,
  result: YuaToolResult<any>,
  finishedAt: number
): Promise<void> {
  await pgPool.query(
    `
    UPDATE public.tool_runs
    SET status = 'error',
        output_json = $2,
        provenance_json = $3,
        metrics_json = $4,
        error_json = $5,
        finished_at = $6
    WHERE id = $1
    `,
    [
      id,
      jsonOrNull(result.output),
      jsonOrNull(result.provenance),
      jsonOrNull(result.metrics),
      jsonOrNull(result.error),
      toDate(finishedAt),
    ]
  );

  await upsertSources(id, result.provenance?.sources);
}

export async function getById(id: string): Promise<YuaToolRunRecord | null> {
  const r = await pgPool.query(
    `
    SELECT
      id,
      trace_id,
      thread_id,
      workspace_id,
      task,
      status,
      inputs_hash,
      tool_version,
      output_json,
      provenance_json,
      metrics_json,
      error_json,
      created_at,
      started_at,
      finished_at
    FROM public.tool_runs
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  const row = r.rows?.[0];
  if (!row) return null;

  const status = row.status as YuaToolRunStatus;

  return {
    id: row.id,
    traceId: row.trace_id,
    threadId: row.thread_id ?? undefined,
    workspaceId: row.workspace_id,
    task: row.task,
    status,
    inputsHash: row.inputs_hash,
    toolVersion: row.tool_version,
    result: row.provenance_json
      ? ({
          status:
            status === "error" ? "ERROR" : status === "finished" ? "OK" : "PARTIAL",
          output: row.output_json ?? undefined,
          provenance: row.provenance_json,
          metrics: row.metrics_json ?? undefined,
          error: row.error_json ?? undefined,
        } as any)
      : undefined,
    createdAt: fromDate(row.created_at) ?? Date.now(),
    startedAt: fromDate(row.started_at),
    finishedAt: fromDate(row.finished_at),
  };
}

/**
 * 캐시 탐색: 같은 workspace/task/inputs_hash/tool_version 이면서 finished/cached 중 최신 1개
 */
export async function findCachedFinished(
  args: FindCachedArgs
): Promise<YuaToolRunRecord | null> {
  const r = await pgPool.query(
    `
    SELECT
      id,
      trace_id,
      thread_id,
      workspace_id,
      task,
      status,
      inputs_hash,
      tool_version,
      output_json,
      provenance_json,
      metrics_json,
      error_json,
      created_at,
      started_at,
      finished_at
    FROM public.tool_runs
    WHERE workspace_id = $1
      AND task = $2
      AND inputs_hash = $3
      AND tool_version = $4
      AND status IN ('finished','cached')
    ORDER BY finished_at DESC NULLS LAST, created_at DESC
    LIMIT 1
    `,
    [args.workspaceId, args.task, args.inputsHash, args.toolVersion]
  );

  const row = r.rows?.[0];
  if (!row) return null;

  return {
    id: row.id,
    traceId: row.trace_id,
    threadId: row.thread_id ?? undefined,
    workspaceId: row.workspace_id,
    task: row.task,
    status: row.status,
    inputsHash: row.inputs_hash,
    toolVersion: row.tool_version,
    result: row.provenance_json
      ? ({
          status: row.status === "error" ? "ERROR" : "OK",
          output: row.output_json ?? undefined,
          provenance: row.provenance_json,
          metrics: row.metrics_json ?? undefined,
          error: row.error_json ?? undefined,
        } as any)
      : undefined,
    createdAt: fromDate(row.created_at) ?? Date.now(),
    startedAt: fromDate(row.started_at),
    finishedAt: fromDate(row.finished_at),
  };
}
