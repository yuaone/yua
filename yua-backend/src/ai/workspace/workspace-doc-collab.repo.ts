import { pgPool } from "../../db/postgres";

export type PersistDocOpInput = {
  docId: string;
  editorUserId: number;
  summary: string;
  stateHash?: string | null;
  ydocStateBase64?: string | null;
  baseVersion?: number | null;
};

export type PersistDocOpResult = {
  conflict?: boolean;
  currentVersion?: number;
  version: number;
  snapshotId: number | null;
  revisionId: number;
};

function sanitizeSummary(summary: string): string {
  const s = String(summary ?? "").trim();
  if (!s) return "doc_op";
  return s.slice(0, 300);
}

function parseYDocState(base64State?: string | null): Buffer | null {
  if (!base64State) return null;
  try {
    const b = Buffer.from(base64State, "base64");
    if (!b.length) return null;
    return b;
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────
   WAL types
   ────────────────────────────────────────── */

export type DocStatePayload = {
  snapshotState: Buffer | null;
  snapshotVersion: number;
  pendingUpdates: Buffer[];
};

export type CompactResult = {
  snapshotId: number;
  version: number;
  deletedUpdates: number;
};

/* ──────────────────────────────────────────
   Compaction 설정
   ────────────────────────────────────────── */

const COMPACTION_MAX_UPDATES = 1000;
const COMPACTION_INTERVAL_MS = 30_000;

export class WorkspaceDocCollabRepo {
  /* ── WAL: 즉시 append (손실 0) ── */

  static async appendUpdate(docId: string, update: Buffer): Promise<bigint> {
    const r = await pgPool.query<{ id: string }>(
      `INSERT INTO workspace_doc_updates (doc_id, update)
       VALUES ($1, $2)
       RETURNING id`,
      [docId, update]
    );
    return BigInt(r.rows[0].id);
  }

  /* ── WAL: 복구용 로드 (snapshot + pending updates) ── */

  static async loadDocState(docId: string): Promise<DocStatePayload> {
    // 1) 최신 snapshot
    const snap = await pgPool.query<{
      version: number;
      ydoc_state: Buffer | null;
      created_at: Date;
    }>(
      `SELECT version, ydoc_state, created_at
       FROM workspace_doc_snapshots
       WHERE doc_id = $1
       ORDER BY version DESC, id DESC
       LIMIT 1`,
      [docId]
    );
    const snapshotVersion = snap.rows[0]?.version ?? 0;
    const snapshotState = snap.rows[0]?.ydoc_state ?? null;
    const snapshotCreatedAt = snap.rows[0]?.created_at ?? new Date(0);

    // 2) snapshot 이후 쌓인 updates
    const updates = await pgPool.query<{ update: Buffer }>(
      `SELECT update
       FROM workspace_doc_updates
       WHERE doc_id = $1
         AND created_at >= $2
       ORDER BY id ASC`,
      [docId, snapshotCreatedAt]
    );

    return {
      snapshotState,
      snapshotVersion,
      pendingUpdates: updates.rows.map((r) => r.update),
    };
  }

  /* ── Compaction: snapshot 생성 + 오래된 updates 삭제 ── */

  static async saveSnapshotAndCompact(
    docId: string,
    version: number,
    ydocState: Buffer,
    stateHash: string | null,
    createdBy: number
  ): Promise<CompactResult> {
    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");

      const snap = await client.query<{ id: number; created_at: Date }>(
        `INSERT INTO workspace_doc_snapshots
           (doc_id, version, ydoc_state, state_hash, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [docId, version, ydocState, stateHash, createdBy]
      );
      const snapshotId = Number(snap.rows[0].id);
      const snapshotCreatedAt = snap.rows[0].created_at;

      const del = await client.query(
        `DELETE FROM workspace_doc_updates
         WHERE doc_id = $1
           AND created_at < $2`,
        [docId, snapshotCreatedAt]
      );
      const deletedUpdates = del.rowCount ?? 0;

      await client.query("COMMIT");
      return { snapshotId, version, deletedUpdates };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  /* ── Compaction 필요 여부 판단 ── */

  static async shouldCompact(
    docId: string,
    lastSnapshotAt: number | null
  ): Promise<boolean> {
    // 조건 1: 시간 기반 (30초 경과)
    if (
      lastSnapshotAt === null ||
      Date.now() - lastSnapshotAt >= COMPACTION_INTERVAL_MS
    ) {
      return true;
    }
    // 조건 2: 건수 기반 (1000개 이상)
    const r = await pgPool.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM workspace_doc_updates
       WHERE doc_id = $1`,
      [docId]
    );
    return Number(r.rows[0]?.cnt ?? 0) >= COMPACTION_MAX_UPDATES;
  }

  /* ── 퇴장 시 flush (남은 updates 전부 compact) ── */

  static async flushOnLastLeave(
    docId: string,
    ydocState: Buffer,
    createdBy: number
  ): Promise<CompactResult | null> {
    const pending = await pgPool.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM workspace_doc_updates
       WHERE doc_id = $1`,
      [docId]
    );
    if (Number(pending.rows[0]?.cnt ?? 0) === 0) return null;

    const ver = await WorkspaceDocCollabRepo.getCurrentVersion(docId);
    return WorkspaceDocCollabRepo.saveSnapshotAndCompact(
      docId,
      ver + 1,
      ydocState,
      null,
      createdBy
    );
  }

  static async getCurrentVersion(docId: string): Promise<number> {
    const r = await pgPool.query<{ v: number }>(
      `
        SELECT COALESCE(MAX(version), 0)::int AS v
        FROM workspace_doc_revisions
        WHERE doc_id = $1
      `,
      [docId]
    );
    return Number(r.rows[0]?.v ?? 0);
  }

  static async persistDocOp(input: PersistDocOpInput): Promise<PersistDocOpResult> {
    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");

      const lock = await client.query<{ id: string }>(
        `
          SELECT id
          FROM workspace_docs
          WHERE id = $1
            AND deleted_at IS NULL
          FOR UPDATE
        `,
        [input.docId]
      );
      if (!lock.rows[0]?.id) {
        throw new Error("doc_not_found");
      }

      const current = await client.query<{ v: number }>(
        `
          SELECT COALESCE(MAX(version), 0)::int AS v
          FROM workspace_doc_revisions
          WHERE doc_id = $1
        `,
        [input.docId]
      );
      const nextVersion = Number(current.rows[0]?.v ?? 0) + 1;
      const currentVersion = nextVersion - 1;

      const baseVersion =
        typeof input.baseVersion === "number" && Number.isFinite(input.baseVersion)
          ? Math.floor(input.baseVersion)
          : null;

      if (baseVersion !== null && baseVersion !== currentVersion) {
        await client.query("ROLLBACK");
        return {
          conflict: true,
          currentVersion,
          version: currentVersion,
          snapshotId: null,
          revisionId: 0,
        };
      }

      const ydocState = parseYDocState(input.ydocStateBase64);
      const stateHash = (input.stateHash ?? "").trim() || null;

      let snapshotId: number | null = null;
      if (ydocState) {
        const snap = await client.query<{ id: number }>(
          `
            INSERT INTO workspace_doc_snapshots
              (doc_id, version, ydoc_state, state_hash, created_by)
            VALUES
              ($1, $2, $3, $4, $5)
            RETURNING id
          `,
          [input.docId, nextVersion, ydocState, stateHash, input.editorUserId]
        );
        snapshotId = Number(snap.rows[0]?.id ?? 0) || null;
      }

      const revision = await client.query<{ id: number }>(
        `
          INSERT INTO workspace_doc_revisions
            (doc_id, snapshot_id, version, editor_user_id, summary)
          VALUES
            ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        [
          input.docId,
          snapshotId,
          nextVersion,
          input.editorUserId,
          sanitizeSummary(input.summary),
        ]
      );
      const revisionId = Number(revision.rows[0]?.id ?? 0);

      await client.query(
        `
          UPDATE workspace_docs
          SET last_edited_by = $2,
              updated_at = now()
          WHERE id = $1
        `,
        [input.docId, input.editorUserId]
      );

      await client.query("COMMIT");
      return {
        version: nextVersion,
        snapshotId,
        revisionId,
      };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}
