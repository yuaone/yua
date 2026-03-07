import crypto from "crypto";
import { runPySolver } from "./py-solver-runner";
import { writeDocument } from "../../db/document-writer";
import fs from "fs/promises";
import path from "path";
import type { DecisionDomain } from "../decision-assistant/decision-domain";
import { renderMarkdownToPDF } from "../document/render/markdown-to-pdf";
import { renderMarkdownToDOCX } from "../document/render/markdown-to-docx";

/* -------------------------------------------------- */
/* Types */
/* -------------------------------------------------- */

export interface DocumentBuilderPayload {
  traceId: string;

  workspaceId: string;
  threadId: number;

  domain: DecisionDomain;
  documentType: string;
  language?: string;

  query: string;

  baseConfidence?: number;
}

/* -------------------------------------------------- */
/* Helpers */
/* -------------------------------------------------- */

function buildMarkdown(sections: {
  order: number;
  type: string;
  content: string;
}[]): string {
  return sections
    .sort((a, b) => a.order - b.order)
    .map(s => {
      return `## ${s.type}\n\n${s.content}\n`;
    })
    .join("\n");
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

async function saveLocalMarkdown(args: {
  documentId: number;
  version: number;
  markdown: string;
}): Promise<{ uri: string; hash: string }> {
  const { documentId, version, markdown } = args;

  const dir = path.join(
    "/mnt/yua/assets/documents",
    String(documentId)
  );

  await fs.mkdir(dir, { recursive: true });

  const filePath = path.join(dir, `v${version}.md`);

  await fs.writeFile(filePath, markdown, "utf8");

  return {
    uri: `/api/assets/documents/${documentId}/v${version}.md`,
    hash: sha256(markdown),
  };
}

/* -------------------------------------------------- */
/* Runner */
/* -------------------------------------------------- */

export async function runDocumentBuilder(input: DocumentBuilderPayload) {
  const {
    traceId,
    workspaceId,
    threadId,
    domain,
    documentType,
    language = "ko",
    query,
    baseConfidence = 0.5,
  } = input;

  /* 1️⃣ PY_SOLVER */
  const solver = await runPySolver({
    traceId,
    query,
    domain,
    options: { wantSteps: true },
  });

  if (!solver.ok || !solver.result) {
    throw new Error("SOLVER_FAILED");
  }

  /* 2️⃣ PY Document Builder */
  const docStruct = await runPySolver({
    traceId,
    query,
    domain,
    options: {
      document: true,
      solverResult: solver.result,
      documentType,
      language,
    },
  });

  if (!docStruct.ok || !docStruct.result) {
    throw new Error("DOCUMENT_BUILDER_FAILED");
  }

  const result = docStruct.result as any;

  /* 3️⃣ Markdown 생성 */
  const markdown = buildMarkdown(result.sections);

  /* 4️⃣ DB write 전에 version 확보 */
  // version은 항상 1부터 (LLM rewrite 시 +1)
  const version = 1;

  /* 5️⃣ DB write (SSOT, ID 확보) */
  const written = await writeDocument({
    workspaceId,
    threadId,
    documentType,
    domain,
    language,

    solverTraceId: traceId,
    confidence: baseConfidence,

    generator: "PY_SOLVER",
    sourceSolver: solver.meta?.solver,

    sections: result.sections,
        file: {
      uri: "PENDING",
      hash: "PENDING",
    },

    lineage: {
      solverName: solver.meta?.solver,
      solverInput: query,
      solverOutputHash: sha256(JSON.stringify(solver.result)),
      ruleSet: ["AUTO_PASS"],
      failedRules: [],
    },
  });

    const documentId = written.documentId;
  const finalVersion = written.version;

/* 6️⃣ Markdown → LOCAL */
const mdFile = await saveLocalMarkdown({
  documentId,
  version: finalVersion,
  markdown,
});

  /* 7️⃣ Markdown → PDF / DOCX */
  const pdfFile = await renderMarkdownToPDF({
    documentId,
    version: finalVersion,
    markdown,
  });

  const docxFile = await renderMarkdownToDOCX({
    documentId,
    version: finalVersion,
    markdown,
  });

  return {
    ok: true,
    documentId,
    version: finalVersion,
    files: {
      markdown: mdFile,
      pdf: pdfFile,
      docx: docxFile,
    },
  };
}
