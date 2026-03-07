// 📂 src/api/control/document-controller.ts
// 🔒 Document Controller — REWRITE SSOT FINAL

import type { Request, Response } from "express";
import { pgPool } from "../db/postgres";

import { runDocumentRewrite } from "../ai/tools/document-rewrite.runner";
import { sectionsToMarkdown, writeMarkdownToGcs } from "../ai/document/document-file-writer";

/* ==================================================
   Helpers
================================================== */

async function loadDocumentWithSections(params: {
  documentId: number;
  version: number;
}) {
  const { documentId, version } = params;

  const docRes = await pgPool.query(
    `
    SELECT id, workspace_id, thread_id, document_type, domain, language
    FROM documents
    WHERE id = $1 AND current_version = $2
    `,
    [documentId, version]
  );

  if (!docRes.rows.length) {
    throw new Error("DOCUMENT_VERSION_NOT_FOUND");
  }

  const doc = docRes.rows[0];

  const secRes = await pgPool.query(
    `
    SELECT
      id,
      section_order AS "order",
      section_type AS "type",
      title,
      content
    FROM document_sections
    WHERE document_id = $1 AND version = $2
    ORDER BY section_order ASC
    `,
    [documentId, version]
  );

  return {
    document: doc,
    sections: secRes.rows.map((s: any) => ({
      order: s.order,
      type: s.type,
      title: s.title ?? undefined,
      content: s.content,
      hash: "", // rewrite runner에서 재계산
      sectionId: s.id,
    })),
  };
}

/* ==================================================
   Controller
================================================== */

export const documentController = {
  /* --------------------------------------------------
   * POST /api/document/rewrite
   * -------------------------------------------------- */
  async rewrite(req: Request, res: Response) {
    const {
      documentId,
      previousVersion,
      sectionId,
      instruction,
    } = req.body ?? {};

    const userId = (req as any).user?.id ?? 1;

    if (
      !Number.isFinite(documentId) ||
      !Number.isFinite(previousVersion) ||
      typeof sectionId !== "string" ||
      !sectionId.trim() ||
      typeof instruction !== "string" ||
      !instruction.trim()
    ) {
      return res.status(400).json({
        ok: false,
        error: "invalid_payload",
      });
    }

    /* ---------------------------------------------
       1️⃣ Load current document + sections
    ---------------------------------------------- */
    const { document, sections } =
      await loadDocumentWithSections({
        documentId,
        version: previousVersion,
      });

    /* ---------------------------------------------
       2️⃣ Workspace permission (EDITOR 이상)
    ---------------------------------------------- */
    const perm = await pgPool.query(
      `
      SELECT role
      FROM workspace_members
      WHERE workspace_id = $1 AND user_id = $2
      `,
      [document.workspace_id, userId]
    );

    if (!perm.rows.length) {
      return res.status(403).json({
        ok: false,
        error: "workspace_access_denied",
      });
    }

    if (perm.rows[0].role === "VIEWER") {
      return res.status(403).json({
        ok: false,
        error: "workspace_permission_denied",
      });
    }

    /* ---------------------------------------------
       3️⃣ Rewrite (section 단위)
    ---------------------------------------------- */
    const rewritten = await runDocumentRewrite({
      traceId: `rewrite-${Date.now()}`,
      workspaceId: document.workspace_id,
      threadId: document.thread_id,
      documentId,
      previousVersion,
      domain: document.domain,
      documentType: document.document_type,
      language: document.language ?? "ko",
      sections: sections.map((s) => ({
        order: s.order,
        type: s.type,
        title: s.title,
        content:
          String(s.sectionId) === String(sectionId)
            ? s.content
            : s.content,
        hash: s.hash,
      })),
    });

    /* ---------------------------------------------
       4️⃣ Reload latest version
    ---------------------------------------------- */
    const latest = await loadDocumentWithSections({
      documentId,
      version: rewritten.version,
    });

    /* ---------------------------------------------
       5️⃣ Markdown 재조합 + GCS 저장
    ---------------------------------------------- */
    const markdown = sectionsToMarkdown(
      latest.sections.map((s) => ({
        order: s.order,
        type: s.type,
        title: s.title,
        content: s.content,
      }))
    );

    const mdFile = await writeMarkdownToGcs(markdown, {
      workspaceId: document.workspace_id,
      documentId,
    });

    /* ---------------------------------------------
       6️⃣ document_versions file_uri 갱신
    ---------------------------------------------- */
    await pgPool.query(
      `
      UPDATE document_versions
      SET file_uri = $1,
          file_hash = $2
      WHERE document_id = $3 AND version = $4
      `,
      [
        mdFile.uri,
        mdFile.hash,
        documentId,
        rewritten.version,
      ]
    );

    /* ---------------------------------------------
       7️⃣ Response
    ---------------------------------------------- */
    return res.status(200).json({
      ok: true,
      result: {
        documentId,
        version: rewritten.version,
        content: markdown,
        sections: latest.sections.map((s) => ({
          order: s.order,
          type: s.type,
          title: s.title,
          content: s.content,
        })),
      },
    });
  },
};
