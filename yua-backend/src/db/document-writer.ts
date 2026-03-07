import { pgPool } from "./postgres";
import { runPythonVisualization } from "../ai/document/visualize/python-visualization.runner";
import { writeDocumentSectionAsset } from "./document-section-asset-writer";
import { MessageEngine } from "../ai/engines/message-engine";

export interface WriteDocumentInput {
  workspaceId: string;
  threadId: number;

  documentType: string;
  domain: string;
  language: string;

  solverTraceId?: string;
  confidence?: number;

  generator: "PY_SOLVER" | "LLM_REWRITE" | "HUMAN_EDIT";
  sourceSolver?: string;

  sections: {
    order: number;
    type: string;
    title?: string;
    content: string;
    hash: string;
  }[];

  file: {
    uri: string;
    hash: string;
  };

  lineage?: {
    solverName?: string;
    solverInput?: string;
    solverOutputHash?: string;
    ruleSet?: string[];
    failedRules?: string[];
  };
}

/**
 * 🔒 SSOT
 * - documents / versions / sections / lineage
 * - 단일 트랜잭션
 * - TEXT 절대 변형 ❌
 */
export async function writeDocument(
  input: WriteDocumentInput
): Promise<{ documentId: number; version: number }> {
  const client = await pgPool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ documents
    const docRes = await client.query(
      `
      INSERT INTO documents
        (workspace_id, thread_id, document_type, domain, title, language,
         solver_trace_id, confidence)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id, current_version
      `,
      [
        input.workspaceId,
        input.threadId,
        input.documentType,
        input.domain,
        `${input.domain} Document`,
        input.language,
        input.solverTraceId ?? null,
        input.confidence ?? null,
      ]
    );

    const documentId = docRes.rows[0].id;
    const version = docRes.rows[0].current_version;

     if (!input.file?.uri || !input.file?.hash) {
      throw new Error(
        "DOCUMENT_FILE_REQUIRED (uri/hash)"
      );
    }
 

    // 2️⃣ document_versions
    await client.query(
      `
      INSERT INTO document_versions
        (document_id, version, generator, source_solver,
         verifier_passed, verifier_reason,
         file_uri, file_hash)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [
        documentId,
        version,
        input.generator,
        input.sourceSolver ?? null,
        true,
        "auto_pass",
        input.file.uri,
        input.file.hash,
      ]
    );

        // 🔒 SSOT: documents.current_version 동기화
    await client.query(
      `
      UPDATE documents
      SET current_version = $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [version, documentId]
    );

    // 3️⃣ sections (order 안정성 보장)
    const sections = [...input.sections].sort(
      (a, b) => a.order - b.order
    );

    for (const s of sections) {
      const secRes = await client.query(
        `
        INSERT INTO document_sections
          (document_id, version, section_order, section_type, title, content)
        VALUES
          ($1,$2,$3,$4,$5,$6)
          RETURNING id
        `,
        [
          documentId,
          version,
          s.order,
          s.type,
          s.title ?? null,
          s.content,
        ]
      );
            const sectionId = secRes.rows[0].id;

      // 🔥 FACTUAL VISUALIZATION (CALCULATION / RESULT만)
      if (s.type === "CALCULATION" || s.type === "RESULT") {
        const viz = await runPythonVisualization({
          sectionId,
          script: s.type === "CALCULATION"
            ? "from plot import calc_plot; calc_plot()"
            : "from plot import result_plot; result_plot()",
          payload: {
            content: s.content,
          },
        });

        await writeDocumentSectionAsset({
          sectionId,
          assetType: "FACTUAL_VISUALIZATION",
          uri: viz.uri,
          hash: viz.hash,
        });
      }
    }

    // 4️⃣ lineage
    if (input.lineage) {
      await client.query(
        `
        INSERT INTO document_lineage
          (document_id, version,
           solver_name, solver_input, solver_output_hash,
           rule_set, failed_rules)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          documentId,
          version,
          input.lineage.solverName ?? null,
          input.lineage.solverInput ?? null,
          input.lineage.solverOutputHash ?? null,
          input.lineage.ruleSet ?? null,
          input.lineage.failedRules ?? null,
        ]
      );
    }

       /**
     * 🔒 SSOT: DOCUMENT 생성 트리거
     * - DOCUMENT는 메시지가 아니라 시스템 자산
     * - system message(meta.studio)는 "관측 트리거" 역할만 수행
     */
    await MessageEngine.addMessage({
      threadId: input.threadId,
      userId: 0, // system
      role: "system",
      content: "",
      meta: {
        studio: {
          sectionId: sections[0]?.order === 0
            ? sections[0].order
            : sections[0]?.order ?? 0,
          assetType: "DOCUMENT",
        },
      },
    });


    await client.query("COMMIT");
    return { documentId, version };

  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
