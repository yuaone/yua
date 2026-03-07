import { pgPool } from "../../db/postgres";
import type { WorkspaceRole } from "../workspace/workspace-access";
import { enqueueThreadTitleJob } from "../activity/activity-title.queue";

type IdLike = number | string;

export type ThreadVisibility = "private" | "workspace";

export type ProjectRole = "owner" | "editor" | "viewer";

export type ThreadCaps = {
  canRead: boolean;
  canWrite: boolean;
  canRename: boolean;
  canDelete: boolean;
  canPin: boolean;
  canMove: boolean;
};

export type ThreadRow = {
  id: number;
  user_id: IdLike;              // owner (⚠️ PG bigint => string 가능)
  title: string;
  auto_titled?: boolean;   // 🔥 추가
  project_id: string | null;
  workspace_id: string;
  visibility: ThreadVisibility;
  metadata: any | null;
  created_at: string;
  last_activity_at: string;
  pinned: boolean;
  pinned_order: number | null;
  workspace_role?: WorkspaceRole | null;
  project_role?: ProjectRole | null;
  caps?: ThreadCaps;
};

export type ThreadMetaRow = {
  id: number;
  workspace_id: string;
  user_id: IdLike;
  project_id: string | null;
  visibility: ThreadVisibility;
};

function toNumId(v: unknown): number {
  // PG bigint(int8)은 string으로 올 수 있음
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function isSameUser(rowUserId: unknown, userId: number): boolean {
  return toNumId(rowUserId) === userId;
}

function isWorkspaceAdmin(role: WorkspaceRole | null | undefined) {
  return role === "owner" || role === "admin";
}

function canWriteByWorkspaceRole(role: WorkspaceRole | null | undefined) {
  return role === "owner" || role === "admin" || role === "member";
}

function canWriteByProjectRole(role: ProjectRole | null | undefined) {
  return role === "owner" || role === "editor";
}

/* =========================================================
   🔥 RULE-BASED AUTO TITLE (EXTENSIBLE)
========================================================= */

type WeightedKeyword = {
  word: string;
  weight: number;
};

type SemanticCategory = {
  id: string;
  keywords: WeightedKeyword[];
  titleKo: string;
  titleEn: string;
};

const GLOBAL_SEMANTIC: SemanticCategory[] = [
  {
    id: "performance",
    keywords: [
      { word: "느림", weight: 3 },
      { word: "느린", weight: 2 },
      { word: "속도", weight: 3 },
      { word: "지연", weight: 2 },
      { word: "slow", weight: 3 },
      { word: "performance", weight: 4 },
      { word: "latency", weight: 4 },
      { word: "speed", weight: 2 },
    ],
    titleKo: "성능 이슈",
    titleEn: "Performance Issue"
  },
  {
    id: "error",
    keywords: [
      { word: "에러", weight: 3 },
      { word: "오류", weight: 4 },
      { word: "실패", weight: 2 },
      { word: "터짐", weight: 3 },
      { word: "error", weight: 4 },
      { word: "crash", weight: 4 },
      { word: "fail", weight: 2 },
      { word: "exception", weight: 5 },
    ],
    titleKo: "오류 이슈",
    titleEn: "Error Issue"
  },
  {
    id: "setup",
    keywords: [
      { word: "설정", weight: 3 },
      { word: "설치", weight: 3 },
      { word: "세팅", weight: 2 },
      { word: "setup", weight: 3 },
      { word: "config", weight: 4 },
      { word: "install", weight: 3 },
    ],
    titleKo: "설정 관련",
    titleEn: "Setup Issue"
  }
];

/* =========================================================
   🔥 Workspace Semantic Cache (In-Memory, TTL)
========================================================= */

type SemanticCacheEntry = {
  data: SemanticCategory[];
  expiresAt: number;
};

const WORKSPACE_SEMANTIC_CACHE = new Map<string, SemanticCacheEntry>();

const SEMANTIC_TTL_MS = 5 * 60 * 1000; // 5 minutes


async function loadWorkspaceSemantic(workspaceId: string): Promise<SemanticCategory[]> {
  const now = Date.now();

  const cached = WORKSPACE_SEMANTIC_CACHE.get(workspaceId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const r = await pgPool.query<{
    category_id: string;
    word: string;
    weight: number;
    title_ko: string;
    title_en: string;
  }>(
    `
    SELECT category_id, word, weight, title_ko, title_en
    FROM workspace_semantic_keywords
    WHERE workspace_id = $1
    `,
    [workspaceId]
  );

  const map = new Map<string, SemanticCategory>();

  for (const row of r.rows) {
    if (!map.has(row.category_id)) {
      map.set(row.category_id, {
        id: row.category_id,
        keywords: [],
        titleKo: row.title_ko,
        titleEn: row.title_en,
      });
    }

    map.get(row.category_id)!.keywords.push({
      word: row.word,
      weight: row.weight,
    });
  }

  const result = Array.from(map.values());

  WORKSPACE_SEMANTIC_CACHE.set(workspaceId, {
    data: result,
    expiresAt: now + SEMANTIC_TTL_MS,
  });

  return result;
}

function detectLang(text: string): "ko" | "en" | "mixed" {
  const hasKo = /[\uAC00-\uD7A3]/.test(text);
  const hasEn = /[a-zA-Z]/.test(text);
  if (hasKo && hasEn) return "mixed";
  if (hasKo) return "ko";
  return "en";
}

function normalize(text: string) {
  return text
    .replace(/\n+/g, " ")
    .replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
/* =========================================================
   🔥 Deterministic Semantic Compact Title (Sidebar SSOT)
========================================================= */

const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","then","so",
  "이","그","저","그리고","하지만","또한",
  "에서","으로","이다","합니다","한다","해야",
  "을","를","이","가","은","는"
]);

function isEnglish(token: string) {
  return /^[a-zA-Z0-9]+$/.test(token);
}

function toCamelCase(token: string) {
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function nominalizeVerb(token: string) {
  return token
    .replace(/(합니다|한다|하였다|했다|해야|하다)$/g, "")
    .replace(/(됩니다|되다|되었다)$/g, "")
    .replace(/(해결했다|해결해야|해결합니다)$/g, "해결")
    .replace(/(분석했다|분석해야|분석합니다)$/g, "분석")
    .replace(/(구현했다|구현해야|구현합니다)$/g, "구현")
    .replace(/(개발했다|개발해야|개발합니다)$/g, "개발")
    .trim();
}

function generateSemanticCompactTitle(text: string): string | null {
  const cleaned = normalize(text);
  if (!cleaned) return null;

  const rawTokens = cleaned.split(" ").map(t => t.trim());

  const tokens = rawTokens
    .map(nominalizeVerb)
    .filter(t =>
      t.length >= 2 &&
      !STOPWORDS.has(t)
    );

  if (!tokens.length) return null;

  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }

  const sorted = Array.from(freq.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, 4)
    .map(([word]) => word);

  const english: string[] = [];
  const korean: string[] = [];

  for (const token of sorted) {
    if (isEnglish(token)) {
      english.push(toCamelCase(token));
    } else {
      korean.push(token);
    }
  }

  const compact = [...english, ...korean].join("");

  return compact.slice(0, 40) || null;
}
function detectSemanticWeighted(
  text: string,
  categories: SemanticCategory[]
) {
  const lower = text.toLowerCase();

  let bestScore = 0;
  let bestCategory: SemanticCategory | null = null;

  for (const cat of categories) {
    let score = 0;

    for (const keyword of cat.keywords) {
      if (lower.includes(keyword.word.toLowerCase())) {
        score += keyword.weight;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  return bestCategory;
}

async function generateAutoTitle(
  text: string,
  workspaceId: string
): Promise<string> {
  const lang = detectLang(text);
  const normalized = normalize(text);

  const workspaceSemantic = await loadWorkspaceSemantic(workspaceId);
  const categories = [...GLOBAL_SEMANTIC, ...workspaceSemantic];

  const semantic = detectSemanticWeighted(normalized, categories);

  if (semantic) {
    return lang === "ko"
      ? semantic.titleKo
      : semantic.titleEn;
  }

return "New Chat";
}

function computeCaps(args: {
  isOwner: boolean;
  visibility: ThreadVisibility;
  projectId: string | null;
  workspaceRole: WorkspaceRole | null;
  projectRole: ProjectRole | null;
}): ThreadCaps {
  const { isOwner, visibility, projectId, workspaceRole, projectRole } = args;

  // ✅ Private: 오직 owner만
  if (visibility === "private" && !projectId) {
    const ok = Boolean(isOwner);
    return {
      canRead: ok,
      canWrite: ok,
      canRename: ok,
      canDelete: ok,
      canPin: ok,
      canMove: ok,
    };
  }
 


  // ✅ Project thread: project_members 또는 workspace admin/owner
  if (projectId) {
    const admin = isWorkspaceAdmin(workspaceRole);
    const member = Boolean(projectRole);
    const canRead = admin || member || isOwner;
    const canWrite = admin || canWriteByProjectRole(projectRole) || isOwner;
    const canRename = admin || canWriteByProjectRole(projectRole) || isOwner;
    const canDelete = admin || projectRole === "owner" || isOwner;
    const canMove = admin || canWriteByProjectRole(projectRole) || isOwner;
    return {
      canRead,
      canWrite,
      canRename,
      canDelete,
      canPin: isOwner, // pin은 글로벌 필드라 SSOT로 owner만 (개인 pin은 추후 스키마 작업)
      canMove,
    };
  }

  // ✅ General(workspace) thread
  const admin = isWorkspaceAdmin(workspaceRole);
  const member = Boolean(workspaceRole);
  const canRead = admin || member || isOwner;
  const canWrite = admin || (visibility === "workspace" && canWriteByWorkspaceRole(workspaceRole)) || isOwner;
  const canRename = admin || isOwner;
  const canDelete = admin || isOwner;
  const canMove = admin || isOwner;
  return {
    canRead,
    canWrite,
    canRename,
    canDelete,
    canPin: isOwner,
    canMove,
  };
}

async function resolvePersonalWorkspaceId(userId: number): Promise<string> {
  // fallback (기존 createThread(userId,title) 호환용)
  const r = await pgPool.query<{ id: string }>(
    `
    SELECT w.id
    FROM workspaces w
    WHERE w.owner_user_id = $1
      AND w.type = 'personal'
      AND w.is_active = true
    LIMIT 1
    `,
    [userId]
  );

  const id = r.rows[0]?.id;
  if (!id) throw new Error("personal_workspace_not_found");
  return id;
}

async function getThreadWithRoles(params: {
  threadId: number;
  userId: number;
  workspaceId: string;
}): Promise<ThreadRow | null> {
  const { threadId, userId, workspaceId } = params;

  const r = await pgPool.query<ThreadRow>(
    `
    SELECT
      t.id, t.user_id, t.title, t.auto_titled,
      t.project_id, t.workspace_id, t.visibility,
      t.metadata, t.created_at, t.last_activity_at, t.pinned, t.pinned_order,
      wu.role as workspace_role,
      pm.role as project_role
    FROM conversation_threads t
    LEFT JOIN workspace_users wu
      ON wu.workspace_id = t.workspace_id AND wu.user_id = $3
    LEFT JOIN project_members pm
      ON pm.project_id = t.project_id AND pm.user_id = $3
    WHERE t.id = $1
      AND t.workspace_id = $2
    LIMIT 1
    `,
    [threadId, workspaceId, userId]
  );

  return r.rows[0] ?? null;
}

export const ThreadEngine = {
    // ✅ workspace 헤더를 신뢰하면 안 되는 케이스(선택된 workspace ≠ thread.workspace_id) 때문에 필요
  // - throw ❌
  // - 존재 안 하면 null
  async getThreadMeta(threadId: number): Promise<ThreadMetaRow | null> {
    if (!Number.isFinite(threadId) || threadId <= 0) return null;
    const r = await pgPool.query<ThreadMetaRow>(
      `
      SELECT id, workspace_id, user_id, project_id, visibility
      FROM conversation_threads
      WHERE id = $1
      LIMIT 1
      `,
      [threadId]
    );
    return r.rows[0] ?? null;
  },
  async getThread(params: {
    threadId: number;
    userId: number;
    workspaceId: string;
  }): Promise<ThreadRow | null> {
    const row = await getThreadWithRoles(params);
    if (!row) return null;

    const caps = computeCaps({
      isOwner: isSameUser(row.user_id, params.userId),
      visibility: row.visibility,
      projectId: row.project_id ?? null,
      workspaceRole: (row.workspace_role ?? null) as any,
      projectRole: (row.project_role ?? null) as any,
    });

    return caps.canRead ? row : null;
  },

  /**
   * ✅ 접근 제어 SSOT
   ✅ Caps 기반 접근 제어 (SSOT)
   */
  async canAccess(params: {
    threadId: number;
    userId: number;
    workspaceId: string;
  }): Promise<boolean> {
     const { threadId, userId, workspaceId } = params;
     const row = await getThreadWithRoles({ threadId, userId, workspaceId });
    if (!row) return false;
    const caps = computeCaps({
      isOwner: isSameUser(row.user_id, params.userId),
      visibility: row.visibility,
      projectId: row.project_id ?? null,
      workspaceRole: (row.workspace_role ?? null) as any,
      projectRole: (row.project_role ?? null) as any,
    });
    return caps.canRead;
  },

    async getCaps(params: { threadId: number; userId: number; workspaceId: string }): Promise<ThreadCaps | null> {
    const { threadId, userId, workspaceId } = params;
    const row = await getThreadWithRoles({ threadId, userId, workspaceId });
    if (!row) return null;
    return computeCaps({
      isOwner: isSameUser(row.user_id, userId),
      visibility: row.visibility,
      projectId: row.project_id ?? null,
      workspaceRole: (row.workspace_role ?? null) as any,
      projectRole: (row.project_role ?? null) as any,
    });
  },

  async canWrite(params: { threadId: number; userId: number; workspaceId: string }): Promise<boolean> {
    const { threadId, userId, workspaceId } = params;
    const caps = await this.getCaps({ threadId, userId, workspaceId });
    return Boolean(caps?.canWrite);
  },

  // 기존 exists 호출 호환 (이제는 project_member도 통과)
  async exists(threadId: number, userId: number, workspaceId: string): Promise<boolean> {
    return this.canAccess({ threadId, userId, workspaceId });
  },

  /**
   * ✅ Create (workspace_id 필수)
   * - 기본 visibility=private
   * - projectId 있으면 project thread
   * - backward compatibility: createThread(userId,title) 지원 (personal ws 자동)
   */
  async createThread(
    arg:
      | number
      | {
          userId: number;
          workspaceId?: string;
          title: string;
          projectId?: string | null;
          visibility?: ThreadVisibility;
        },
    title?: string
  ): Promise<number> {
    let userId: number;
    let workspaceId: string;
    let finalTitle: string;
    let projectId: string | null = null;
    let visibility: ThreadVisibility = "private";

    if (typeof arg === "number") {
      userId = arg;
      finalTitle = title ?? "New Chat";
      workspaceId = await resolvePersonalWorkspaceId(userId);
    } else {
      userId = arg.userId;
      finalTitle = arg.title;
      projectId = arg.projectId ?? null;
      visibility = arg.visibility ?? (projectId ? "workspace" : "private");
      workspaceId = arg.workspaceId ?? (await resolvePersonalWorkspaceId(userId));
    }

    const r = await pgPool.query<{ id: number }>(
      `
      INSERT INTO conversation_threads (
        workspace_id,
        user_id,
        title,
        auto_titled,
        project_id,
        visibility,
        pinned,
        pinned_order
      )
      VALUES ($1, $2, $3,
      false,
      $4, $5, false, NULL)
      RETURNING id
      `,
      [workspaceId, userId, finalTitle, projectId, visibility]
    );

    const id = r.rows[0]?.id;
    if (!id) throw new Error("Thread creation failed");
    return id;
  },

  /**
   * ✅ List (workspace scope)
   * - 내 private thread + 내가 속한 project thread + (visibility=workspace general thread)
   * - projectId filter optional
   */
  async listThreads(params: {
    userId: number;
    workspaceId: string;
    projectId?: string | null;
  }): Promise<ThreadRow[]> {
    const { userId, workspaceId, projectId } = params;

    // ✅ IMPORTANT: projectId=null 은 SQL에 바인딩 변수가 없으므로 args에 넣으면 안 됨
    let whereProject = "";
    const args: any[] = [workspaceId, userId];

    if (projectId === null) {
      whereProject = "AND t.project_id IS NULL";
    } else if (typeof projectId === "string") {
      whereProject = "AND t.project_id = $3";
      args.push(projectId);
    }


    const r = await pgPool.query<ThreadRow>(
      `
      SELECT
        t.id, t.user_id, t.title, t.auto_titled,
        t.project_id, t.workspace_id, t.visibility,
        t.metadata, t.created_at, t.last_activity_at, t.pinned, t.pinned_order,
        wu.role as workspace_role,
        pm.role as project_role 
      FROM conversation_threads t
      LEFT JOIN workspace_users wu
       ON wu.workspace_id = t.workspace_id AND wu.user_id = $2
      LEFT JOIN project_members pm
        ON pm.project_id = t.project_id AND pm.user_id = $2 
      WHERE t.workspace_id = $1
        ${whereProject}
        AND (
          -- owner always
          t.user_id = $2

          -- general workspace threads: workspace member can read
          OR (
            t.project_id IS NULL
            AND t.visibility = 'workspace'
            AND wu.role IS NOT NULL
          )

          -- project threads: project member OR workspace admin/owner
          OR (
            t.project_id IS NOT NULL
            AND (pm.role IS NOT NULL OR wu.role IN ('owner','admin'))
          )
        )
      ORDER BY
        t.pinned DESC,
        t.pinned_order ASC NULLS LAST,
        t.last_activity_at DESC
      `,
      args
    );

    // ✅ caps 계산은 TS에서 (UI/가드 SSOT)
    return r.rows.map((row) => {
      const caps = computeCaps({
        isOwner: isSameUser(row.user_id, userId),
        visibility: row.visibility,
        projectId: row.project_id ?? null,
        workspaceRole: (row.workspace_role ?? null) as any,
        projectRole: (row.project_role ?? null) as any,
      });
      return { ...row, caps };
    }) as any;
  },

  /**
   * ✅ List threads grouped by ALL workspaces the user belongs to.
   * Uses LATERAL JOIN for efficient top-N-per-group retrieval (2 queries total).
   * - Personal workspace always first
   * - Visibility rules enforced per thread
   * - Returns threadCount + hasMore for pagination UX
   */
  async listThreadsGrouped(params: {
    userId: number;
    perGroup?: number;
  }): Promise<{
    groups: Array<{
      workspace: {
        id: string;
        name: string;
        type: string;
        role: string;
      };
      threads: ThreadRow[];
      threadCount: number;
      hasMore: boolean;
    }>;
  }> {
    const { userId, perGroup = 10 } = params;
    const limit = Math.min(Math.max(perGroup, 1), 50); // clamp 1..50

    // ── Query 1: Get all workspaces + top N threads per workspace via LATERAL JOIN ──
    const threadsResult = await pgPool.query<
      ThreadRow & {
        ws_id: string;
        ws_name: string | null;
        ws_type: string;
        ws_role: string;
        rn: string; // row_number comes as string from PG
      }
    >(
      `
      WITH user_workspaces AS (
        SELECT
          w.id   AS ws_id,
          w.name AS ws_name,
          w.type AS ws_type,
          wu.role AS ws_role
        FROM workspace_users wu
        JOIN workspaces w ON w.id = wu.workspace_id
        WHERE wu.user_id = $1
        ORDER BY
          CASE WHEN w.type = 'personal' THEN 0 ELSE 1 END,
          w.created_at ASC NULLS LAST
      )
      SELECT
        uw.ws_id,
        uw.ws_name,
        uw.ws_type,
        uw.ws_role,
        lt.id,
        lt.user_id,
        lt.title,
        lt.auto_titled,
        lt.project_id,
        lt.workspace_id,
        lt.visibility,
        lt.metadata,
        lt.created_at,
        lt.last_activity_at,
        lt.pinned,
        lt.pinned_order,
        lt.workspace_role,
        lt.project_role,
        lt.rn
      FROM user_workspaces uw
      LEFT JOIN LATERAL (
        SELECT
          t.id, t.user_id, t.title, t.auto_titled,
          t.project_id, t.workspace_id, t.visibility,
          t.metadata, t.created_at, t.last_activity_at, t.pinned, t.pinned_order,
          wu2.role AS workspace_role,
          pm.role  AS project_role,
          ROW_NUMBER() OVER (
            ORDER BY t.pinned DESC, t.pinned_order ASC NULLS LAST, t.last_activity_at DESC
          ) AS rn
        FROM conversation_threads t
        LEFT JOIN workspace_users wu2
          ON wu2.workspace_id = t.workspace_id AND wu2.user_id = $1
        LEFT JOIN project_members pm
          ON pm.project_id = t.project_id AND pm.user_id = $1
        WHERE t.workspace_id = uw.ws_id
          AND (
            t.user_id = $1
            OR (
              t.project_id IS NULL
              AND t.visibility = 'workspace'
              AND wu2.role IS NOT NULL
            )
            OR (
              t.project_id IS NOT NULL
              AND (pm.role IS NOT NULL OR wu2.role IN ('owner','admin'))
            )
          )
        ORDER BY t.pinned DESC, t.pinned_order ASC NULLS LAST, t.last_activity_at DESC
        LIMIT $2
      ) lt ON true
      ORDER BY
        CASE WHEN uw.ws_type = 'personal' THEN 0 ELSE 1 END,
        uw.ws_id,
        lt.rn ASC NULLS LAST
      `,
      [userId, limit]
    );

    // ── Query 2: Get total thread counts per workspace (single query for all) ──
    const countsResult = await pgPool.query<{
      workspace_id: string;
      cnt: string;
    }>(
      `
      SELECT t.workspace_id, COUNT(*)::text AS cnt
      FROM conversation_threads t
      JOIN workspace_users wu
        ON wu.workspace_id = t.workspace_id AND wu.user_id = $1
      LEFT JOIN project_members pm
        ON pm.project_id = t.project_id AND pm.user_id = $1
      WHERE wu.user_id = $1
        AND (
          t.user_id = $1
          OR (
            t.project_id IS NULL
            AND t.visibility = 'workspace'
            AND wu.role IS NOT NULL
          )
          OR (
            t.project_id IS NOT NULL
            AND (pm.role IS NOT NULL OR wu.role IN ('owner','admin'))
          )
        )
      GROUP BY t.workspace_id
      `,
      [userId]
    );

    const countMap = new Map<string, number>();
    for (const row of countsResult.rows) {
      countMap.set(row.workspace_id, Number(row.cnt));
    }

    // ── Assemble grouped result ──
    // Use a Map to preserve workspace ordering from the query
    const groupMap = new Map<
      string,
      {
        workspace: { id: string; name: string; type: string; role: string };
        threads: ThreadRow[];
      }
    >();

    for (const row of threadsResult.rows) {
      if (!groupMap.has(row.ws_id)) {
        groupMap.set(row.ws_id, {
          workspace: {
            id: row.ws_id,
            name: row.ws_name ?? (row.ws_type === "personal" ? "Personal Workspace" : "Workspace"),
            type: row.ws_type,
            role: row.ws_role,
          },
          threads: [],
        });
      }
      const group = groupMap.get(row.ws_id)!;
      // LATERAL LEFT JOIN produces a row with null thread fields for empty workspaces
      if (row.id != null) {
        const caps = computeCaps({
          isOwner: isSameUser(row.user_id, userId),
          visibility: row.visibility,
          projectId: row.project_id ?? null,
          workspaceRole: (row.workspace_role ?? null) as any,
          projectRole: (row.project_role ?? null) as any,
        });
        group.threads.push({ ...row, caps } as any);
      }
    }

    const groups = Array.from(groupMap.values()).map((g) => {
      const threadCount = countMap.get(g.workspace.id) ?? 0;
      return {
        workspace: g.workspace,
        threads: g.threads,
        threadCount,
        hasMore: threadCount > limit,
      };
    });

    return { groups };
  },

  async renameThread(threadId: number, userId: number, workspaceId: string, title: string): Promise<boolean> {
    const caps = await this.getCaps({ threadId, userId, workspaceId });
    if (!caps?.canRename) return false;
    const r = await pgPool.query(
      `
      UPDATE conversation_threads
      SET title = $1,
          auto_titled = false,
          last_activity_at = NOW()
      WHERE id = $2 AND workspace_id = $3
      RETURNING id
      `,
      [title, threadId, workspaceId]
    );
    return r.rows.length > 0;
  },

  async togglePin(threadId: number, userId: number, workspaceId: string): Promise<{ pinned: boolean; pinned_order: number | null }> {
    const caps = await this.getCaps({ threadId, userId, workspaceId });
    if (!caps?.canPin) throw new Error("pin_not_allowed");
    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");

      const cur = await client.query<{ pinned: boolean }>(
        `
        SELECT pinned
        FROM conversation_threads
        WHERE id = $1 AND user_id = $2 AND workspace_id = $3
        FOR UPDATE
        `,
        [threadId, userId, workspaceId]
      );
      if (!cur.rows.length) throw new Error("Thread not found");

      const isPinned = cur.rows[0].pinned;
      let pinnedOrder: number | null = null;

      if (!isPinned) {
        const next = await client.query<{ next: number }>(
          `
          SELECT COALESCE(MAX(pinned_order), 0) + 1 AS next
          FROM conversation_threads
          WHERE workspace_id = $1 AND user_id = $2 AND pinned = true
          `,
          [workspaceId, userId]
        );
        pinnedOrder = next.rows[0].next;
      }

      const updated = await client.query<{ pinned: boolean; pinned_order: number | null }>(
        `
        UPDATE conversation_threads
        SET pinned = $1, pinned_order = $2, last_activity_at = NOW()
        WHERE id = $3 AND user_id = $4 AND workspace_id = $5
        RETURNING pinned, pinned_order
        `,
        [!isPinned, pinnedOrder, threadId, userId, workspaceId]
      );

      await client.query("COMMIT");
      return updated.rows[0];
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },

  async deleteThread(threadId: number, userId: number, workspaceId: string): Promise<boolean> {
    const caps = await this.getCaps({ threadId, userId, workspaceId });
     if (!caps?.canDelete) return false;
    const r = await pgPool.query(
      `
      DELETE FROM conversation_threads
      WHERE id = $1 AND workspace_id = $2
      RETURNING id
      `,
      [threadId, workspaceId]
    );
    return r.rows.length > 0;
  },

    /**
   * ✅ Bump = last_activity_at = NOW()
   * - "상단으로 보내기" 용
   * - 최소 권한: canWrite (읽기만 가능한 사람에게는 활동/정렬 변경을 허용하지 않음)
   */
  async bumpThread(params: {
    threadId: number;
    userId: number;
    workspaceId: string;
  }): Promise<{ lastActiveAt: number } | null> {
    const { threadId, userId, workspaceId } = params;
    const caps = await this.getCaps({ threadId, userId, workspaceId });
    if (!caps?.canWrite) return null;

    const r = await pgPool.query<{ last_active_at: string }>(
      `
      UPDATE conversation_threads
      SET last_activity_at = NOW()
      WHERE id = $1 AND workspace_id = $2
      RETURNING last_activity_at
      `,
      [threadId, workspaceId]
    );
    if (!r.rows.length) return null;
    return { lastActiveAt: new Date(r.rows[0].last_active_at).getTime() };
  },

  async autoTitleThread(params: {
  threadId: number;
  userId: number;
  workspaceId: string;
  seed?: string; // ✅ NEW
}): Promise<{ ok: boolean; title?: string }> {
  const { threadId, workspaceId } = params;

  // 1️⃣ thread 조회
  const r = await pgPool.query<{
    title: string;
    auto_titled: boolean;
  }>(
    `
    SELECT title, auto_titled
    FROM conversation_threads
    WHERE id = $1 AND workspace_id = $2
    LIMIT 1
    `,
    [threadId, workspaceId]
  );

  const thread = r.rows[0];
  if (!thread) return { ok: false };

  // 2️⃣ guard
  // allow auto title if:
  // - still default title ("New Chat")
  // - OR previously auto_titled=true
  // block only when user manually renamed
 // 🔥 user가 수동 rename한 경우만 차단
 // auto_titled=false + title!="New Chat" + seed가 같은 경우만 차단
 // 지금은 일단 항상 허용 (worker가 최종 판단)
  // 3️⃣ 최근 메시지
 const msg = await pgPool.query<{ content: string }>(
   `
   SELECT content
   FROM chat_messages
   WHERE thread_id = $1
     AND role = 'user'
   ORDER BY id ASC
   LIMIT 1
   `,
   [threadId]
 );

 const textFromDb = (msg.rows[0]?.content ?? "").trim();
 const seed = (params.seed ?? "").trim();

 // ✅ DB에 아직 첫 메시지가 없으면 seed fallback
 const text = textFromDb || seed;

 if (!text) {
   console.log("[AUTO_TITLE][ENGINE] no text available");
   return { ok: false };
 }

  // 🔥 LLM Worker로 enqueue (sidebar title)
  await enqueueThreadTitleJob({
    threadId,
    workspaceId,
    body: text,
    traceId: `thread-${threadId}`
  });
  console.log("[THREAD_ENGINE][ENQUEUE_THREAD_TITLE]", {
    threadId,
    workspaceId,
    bodyPreview: text.slice(0, 60)
  });
  return { ok: true };
},

    /**
   * ✅ Move thread (General ↔ Project, Project ↔ Project)
   * - projectId=null => general
   * - projectId=uuid => project
   * - projectId가 있으면 visibility는 workspace로 강제(SSOT)
   */
  async moveThread(params: {
    threadId: number;
    userId: number;
    workspaceId: string;
    projectId: string | null;
    // targetProjectRole: move 대상 프로젝트에서의 role (router에서 계산해서 넣어도 됨)
    targetProjectRole?: ProjectRole | null;
    workspaceRole?: WorkspaceRole | null;
  }): Promise<boolean> {
    const { threadId, userId, workspaceId, projectId } = params;

    const row = await getThreadWithRoles({ threadId, userId, workspaceId });
    if (!row) return false;

    const caps = computeCaps({
      isOwner: isSameUser(row.user_id, userId),
      visibility: row.visibility,
      projectId: row.project_id ?? null,
      workspaceRole: (row.workspace_role ?? null) as any,
      projectRole: (row.project_role ?? null) as any,
    });

    if (!caps.canMove) return false;

    // private 타인 thread는 절대 불가 (caps에서 이미 막힘)

    // target project로 이동 시: 권한 추가 체크
    if (projectId) {
      const admin = isWorkspaceAdmin(row.workspace_role ?? null);
      const tRole = params.targetProjectRole ?? null;
      if (!admin && !canWriteByProjectRole(tRole) && !isSameUser(row.user_id, userId)) {
        // non-admin은 target 프로젝트에서 owner/editor 아니면 이동 불가
        return false;
      }
    }

    const nextVisibility: ThreadVisibility =
      projectId ? "workspace" : row.visibility;

    const r = await pgPool.query(
      `
      UPDATE conversation_threads
      SET project_id = $1,
          visibility = $2,
          last_activity_at = NOW()
      WHERE id = $3 AND workspace_id = $4
      RETURNING id
      `,
      [projectId, nextVisibility, threadId, workspaceId]
    );

    return r.rows.length > 0;
  },

  /**
   * ✅ Admin 승격 (promote)
   * - thread를 project thread로 이동
   * - visibility는 workspace로 고정 (공유 성격)
   */
  async promoteToProject(params: {
    threadId: number;
    workspaceId: string;
    projectId: string;
    actorUserId: number;
  }): Promise<boolean> {
    
    const { threadId, workspaceId, projectId, actorUserId } = params;
    return this.moveThread({
      threadId,
      workspaceId,
      projectId,
      userId: actorUserId,
    });

    
  },
};
