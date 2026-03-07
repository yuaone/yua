// 🔥 FILE SESSION REPOSITORY — FINAL (SSOT)
// 책임:
// - thread 단위 active 세션 조회
// - 세션 생성 (invalidate + insert 원자적 처리)
// - 세션 무효화
// - 캐시 재사용 탐색

import { pgPool } from "./postgres";

export interface ThreadFileSession {
  id: string;
  thread_id: number;
  workspace_id: string;
  tool_run_id: string;
  inputs_hash: string;
  files_json: any;
  summary_json: any | null;
  active: boolean;
  created_at: string;
  invalidated_at: string | null;
}

/* -------------------------------------------------- */
/* GET ACTIVE SESSION */
/* -------------------------------------------------- */

export async function getActiveFileSession(
  threadId: number
): Promise<ThreadFileSession | null> {
  const r = await pgPool.query<ThreadFileSession>(
    `
    SELECT *
    FROM public.thread_file_sessions
    WHERE thread_id = $1
      AND active = true
    LIMIT 1
    `,
    [threadId]
  );

  return r.rows[0] ?? null;
}

/* -------------------------------------------------- */
/* INVALIDATE ACTIVE SESSION */
/* -------------------------------------------------- */

export async function invalidateActiveFileSession(
  threadId: number
): Promise<void> {
  await pgPool.query(
    `
    UPDATE public.thread_file_sessions
    SET active = false,
        invalidated_at = now()
    WHERE thread_id = $1
      AND active = true
    `,
    [threadId]
  );
}

/* -------------------------------------------------- */
/* CREATE NEW SESSION (ATOMIC) */
/* -------------------------------------------------- */

export interface CreateFileSessionParams {
  threadId: number;
  workspaceId: string;
  toolRunId: string;
  inputsHash: string;
  filesJson: any;
  summaryJson?: any;
}

export async function createFileSession(
  params: CreateFileSessionParams
): Promise<ThreadFileSession> {
  const {
    threadId,
    workspaceId,
    toolRunId,
    inputsHash,
    filesJson,
    summaryJson,
  } = params;

  const client = await pgPool.connect();

  try {
    await client.query("BEGIN");

    // 🔥 1️⃣ 기존 active 세션 무효화
    await client.query(
      `
      UPDATE public.thread_file_sessions
      SET active = false,
          invalidated_at = now()
      WHERE thread_id = $1
        AND active = true
      `,
      [threadId]
    );

    // 🔥 2️⃣ 새 세션 생성
    const insert = await client.query<ThreadFileSession>(
      `
      INSERT INTO public.thread_file_sessions
        (thread_id, workspace_id, tool_run_id, inputs_hash, files_json, summary_json, active)
      VALUES
        ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
      `,
      [
        threadId,
        workspaceId,
        toolRunId,
        inputsHash,
        filesJson,
        summaryJson ?? null,
      ]
    );

    await client.query("COMMIT");

    return insert.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/* -------------------------------------------------- */
/* FIND SESSION BY INPUTS HASH (CACHE REUSE) */
/* -------------------------------------------------- */

export async function findReusableFileSession(
  workspaceId: string,
  inputsHash: string
): Promise<ThreadFileSession | null> {
  const r = await pgPool.query<ThreadFileSession>(
    `
    SELECT *
    FROM public.thread_file_sessions
    WHERE workspace_id = $1
      AND inputs_hash = $2
      AND active = true
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [workspaceId, inputsHash]
  );

  return r.rows[0] ?? null;
}
