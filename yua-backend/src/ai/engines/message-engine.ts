  import { pgPool } from "../../db/postgres";
  import { ThreadEngine } from "./thread.engine";
  import { resignFileUrl } from "../../utils/signed-url";

  /* =========================
    Types
  ========================= */

  export type MessageRow = {
    id: number;
    thread_id: number;
    role: "user" | "assistant" | "system";
    content: string;
    model: string | null;
    trace_id: string | null;
    created_at: string;
     meta: {
   studio?: {
     sectionId: number;
     assetType: "IMAGE" | "DOCUMENT" | "VIDEO";
     traceId?: string | null;   // ✅ 추가
   };
   imageLoading?: boolean;
   isImageOnly?: boolean;
  sources?: {
    id: string;
    label: string;
    url: string;
    host?: string | null;
  }[];
 } | null;
  files: {
    id: number;
    fileName: string | null;
    mimeType: string | null;
    fileKind: "image" | "audio" | "video" | "file";
    fileUrl: string | null;
    sizeBytes: number | null;
  }[];
  };

  /* =========================
    Engine
  ========================= */

  export const MessageEngine = {
    /* --------------------------------------------------
      Exists Assistant By Trace
    -------------------------------------------------- */
    async existsAssistantByTrace(
      threadId: number | string,
      traceId: string
    ): Promise<boolean> {
      const r = await pgPool.query(
        `
        SELECT 1
        FROM chat_messages
        WHERE thread_id = $1 AND trace_id = $2 AND role = 'assistant'
        LIMIT 1
        `,
        [Number(threadId), traceId]
      );
      return r.rows.length > 0;
    },
    /* --------------------------------------------------
      Add Message (SSOT + AUTO-HEAL + userId)
    -------------------------------------------------- */
    async addMessage(params: {
      threadId: number;
      userId: number;
      role: "user" | "assistant" | "system";
      content: string;
      model?: string | null;
      traceId?: string | null;
      thinkingProfile?: "FAST" | "NORMAL" | "DEEP";
      reasoningJson?: any | null;
        meta?: {
    studio?: {
      sectionId: number;
      assetType: "IMAGE" | "DOCUMENT" | "VIDEO";
      traceId?: string | null;
    };
    imageLoading?: boolean;
    isImageOnly?: boolean;
    inputMethod?: "keyboard" | "voice";
  sources?: {
    id: string;
    label: string;
    url: string;
    host?: string | null;
  }[];
  };
      files?: {
        fileName?: string | null;
        mimeType?: string | null;
        fileKind: "image" | "audio" | "video" | "file";
        fileUrl?: string | null;
        sizeBytes?: number | null;
      }[] | null;
    }): Promise<number> {
 console.log("[MSG_ENGINE][ENTER]", {
   threadId: params.threadId,
   role: params.role,
   hasContent: Boolean(params.content?.trim()),
   contentLength:
     typeof params.content === "string"
       ? params.content.length
       : 0,
   filesCount:
     Array.isArray(params.files)
       ? params.files.length
       : 0,
 });
      // 🔒 SSOT: content OR files 중 하나는 반드시 허용
      // assistant + traceId = pending placeholder 허용 (스트리밍 시작 시 빈 content)
      const hasContent = Boolean(params.content?.trim());
      const hasFiles = Array.isArray(params.files) && params.files.length > 0;
      const isPendingAssistant = params.role === "assistant" && Boolean(params.traceId);

      if (!hasContent && !hasFiles && !params.meta?.studio && !isPendingAssistant) {
        return -1;
      }

      let threadId = params.threadId;

      /* ---------------------------------------------
        🔒 Message Insert
      --------------------------------------------- */

      
      // 🔒 HARD DUPLICATE GUARD (assistant + traceId)
      if (
        params.role === "assistant" &&
        params.traceId
      ) {
        const existing = await pgPool.query<{ id: number }>(
          `
          SELECT id
          FROM chat_messages
          WHERE thread_id = $1
            AND trace_id = $2
            AND role = 'assistant'
          LIMIT 1
          `,
          [threadId, params.traceId]
        );

        if (existing.rows.length > 0) {
          console.warn("[MSG_ENGINE][DUPLICATE_BLOCKED]", {
            threadId,
            traceId: params.traceId,
            existingId: existing.rows[0].id,
          });

          return existing.rows[0].id;
        }
      }

      let messageId: number;

      try {
        const r = await pgPool.query<{ id: number }>(
        `
INSERT INTO chat_messages
(
  thread_id,
  role,
  content,
  model,
  trace_id,
  meta,
  created_at
)
 VALUES
  ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id
        `,
        [
          threadId,
          params.role,
          params.content,
          params.model ?? null,
          params.traceId ?? null,
          params.meta ?? null,
        ]
      );

        messageId = r.rows[0]?.id;

      } catch (e: any) {
        if (
          e.code === "23505" &&
          params.role === "assistant" &&
          params.traceId
        ) {
          const existing = await pgPool.query<{ id: number }>(
            `
            SELECT id
            FROM chat_messages
            WHERE thread_id = $1
              AND trace_id = $2
              AND role = 'assistant'
            LIMIT 1
            `,
            [threadId, params.traceId]
          );

          if (existing.rows.length > 0) {
            return existing.rows[0].id;
          }
        }

        throw e;
      }

      if (!messageId) {
        throw new Error("Message insert failed");
      }
       console.log("[MSG_ENGINE][MESSAGE_INSERTED]", {
   messageId,
 });

      /* ---------------------------------------------
        📎 Optional Files
      --------------------------------------------- */
      if (hasFiles) {
        for (const f of params.files!) {
 console.log("[MSG_ENGINE][FILE_INSERT_TRY]", {
   messageId,
   fileKind: f.fileKind,
   fileName: f.fileName ?? null,
 });
          await pgPool.query(
            `
            INSERT INTO chat_files
              (
                message_id,
                file_name,
                mime_type,
                file_kind,
                file_url,
                size_bytes
              )
            VALUES
              ($1, $2, $3, $4, $5, $6)
            `,
            [
              messageId,
              f.fileName ?? null,
              f.mimeType ?? null,
              f.fileKind,
              f.fileUrl ?? null,
              f.sizeBytes ?? null,
            ]
          );
          console.log("[MSG_ENGINE][FILE_INSERT_OK]", {
      messageId,
      fileName: f.fileName,
    });
        }
      }

      return messageId;
    },

    /* --------------------------------------------------
      Delete Pending (empty assistant placeholder cleanup)
    -------------------------------------------------- */
    async deletePending(messageId: number): Promise<void> {
      await pgPool.query(
        `DELETE FROM chat_messages WHERE id = $1 AND content = '' AND role = 'assistant'`,
        [messageId]
      );
    },

    /* --------------------------------------------------
      Update Content + Meta (streaming completion)
    -------------------------------------------------- */
    async updateContent(
      messageId: number,
      content: string,
      meta?: Record<string, any> | null,
    ): Promise<void> {
      await pgPool.query(
        `
        UPDATE chat_messages
        SET content = $2,
            meta = COALESCE($3, meta)
        WHERE id = $1
        `,
        [messageId, content, meta ?? null]
      );
    },

    /* --------------------------------------------------
      List Messages
    -------------------------------------------------- */
    async listMessages(threadId: number): Promise<MessageRow[]> {
      const r = await pgPool.query(
        `
        SELECT
          m.id,
          m.thread_id,
          m.role,
          m.content,
          m.model,
          m.trace_id,
          m.meta,
          m.thinking_profile,
          m.reasoning_json,
          m.thinking_completed_at,
          (m.meta->'studio'->>'sectionId')::int AS section_id,
          m.created_at,
  COALESCE(
    json_agg(
      json_build_object(
        'id', f.id,
        'fileName', f.file_name,
        'mimeType', f.mime_type,
        'fileKind', f.file_kind,
        'fileUrl', f.file_url,
        'sizeBytes', f.size_bytes
      )
    ) FILTER (WHERE f.id IS NOT NULL),
    '[]'::json
  ) AS files
        FROM chat_messages m
        LEFT JOIN chat_files f ON f.message_id = m.id
        WHERE m.thread_id = $1
        GROUP BY m.id
        ORDER BY m.id ASC
        `,
        [threadId]
      );

      // Re-sign file URLs so expired tokens are refreshed (24 h TTL)
      const rows = r.rows as MessageRow[];
      for (const row of rows) {
        if (Array.isArray(row.files)) {
          for (const f of row.files) {
            if (f.fileUrl) {
              f.fileUrl = resignFileUrl(f.fileUrl, 86_400);
            }
          }
        }
      }

      return rows;
    },
  };
