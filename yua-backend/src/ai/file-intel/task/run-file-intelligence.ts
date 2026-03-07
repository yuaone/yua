import crypto from "node:crypto";
import fs from "node:fs/promises";
import { FileIntelAttachment, ExtractedFile, FileIntelIR } from "../types";
import { extractAll } from "../extractors/router";
import { detectSchema } from "../extractors/schema/detect-schema";
import { adaptiveChunk } from "../chunk/adaptive-chunker";
import { approxTokenEstimate, createFileId, ensureNotEmpty } from "../utils/fs";
import { cleanupExtractedTemps } from "../utils/temp-cleanup";
import {
  DbClient,
  findDocumentIdByContentHash,
  insertChunksBatch,
  upsertFileDocument,
  upsertFileSession,
} from "../vector/db";
import { Embedder } from "../vector/embedder";

export type RunFileIntelligenceArgs = {
  attachments: FileIntelAttachment[];
  message: string;
  workspaceId: string;
  threadId: number;

  db: DbClient;
  embedder: Embedder;

  batchSize?: number;
};

export async function runFileIntelligence(args: RunFileIntelligenceArgs): Promise<{
  sessionId: string;
  summary: string;
  chunkCount: number;
  metadata: any;
}> {
  const extracted = await extractAll(args.attachments);

  try {
    const sessionSummaryJson = {
      files: extracted.map((f) => ({
        fileId: f.fileId,
        fileName: f.fileName,
        fileType: f.fileType,
        sizeBytes: f.sizeBytes,
        kind: f.kind,
      })),
      updatedAt: Date.now(),
      task: "FILE_INTELLIGENCE",
    };

    const { sessionId } = await upsertFileSession({
      db: args.db,
      workspaceId: args.workspaceId,
      threadId: args.threadId,
      summaryJson: sessionSummaryJson,
    });

    const fileIRs: FileIntelIR[] = [];
    let totalChunks = 0;

    for (const file of extracted) {
      const schema = await detectSchema(file);
      const ir = await normalizeToIR(file);
      fileIRs.push(ir);

      const contentHash = await computeContentHash(file);
      const existingDocumentId = await findDocumentIdByContentHash({
        db: args.db,
        sessionId,
        contentHash,
      });

      if (existingDocumentId) {
        console.log("[FILE_DEDUPE]", {
          reused: true,
          sessionId,
          contentHash,
        });
        continue;
      }

      const { documentId } = await upsertFileDocument({
        db: args.db,
        sessionId,
        fileName: file.fileName,
        fileType: file.fileType,
        mimeType: file.mimeType ?? null,
        sizeBytes: file.sizeBytes,
        irJson: ir,
        contentHash,
      });

      console.log("[FILE_DEDUPE]", {
        reused: false,
        sessionId,
        contentHash,
      });

      const batchSize = args.batchSize ?? 32;
      const batch: Array<{ chunk: any; embedding: number[] }> = [];

      for await (const chunk of adaptiveChunk(file, schema)) {
        const content = ensureNotEmpty(chunk.content, "(empty)");
        const tokenEstimate = chunk.tokenEstimate ?? approxTokenEstimate(content);

        const [emb] = await args.embedder.embedTexts([content]);
        batch.push({ chunk: { ...chunk, content, tokenEstimate }, embedding: emb });

        if (batch.length >= batchSize) {
          await insertChunksBatch({
            db: args.db,
            embedder: args.embedder,
            sessionId,
            documentId,
            chunks: batch.splice(0, batch.length),
          });
        }
        totalChunks++;
      }

      if (batch.length) {
        await insertChunksBatch({
          db: args.db,
          embedder: args.embedder,
          sessionId,
          documentId,
          chunks: batch,
        });
      }
    }

    const finalSummaryJson = { ...sessionSummaryJson, irPreview: fileIRs };
    await upsertFileSession({
      db: args.db,
      workspaceId: args.workspaceId,
      threadId: args.threadId,
      summaryJson: finalSummaryJson,
    });

    return {
      sessionId,
      summary: buildHumanSummary(fileIRs),
      chunkCount: totalChunks,
      metadata: { files: extracted.length, chunks: totalChunks },
    };
  } finally {
    await cleanupExtractedTemps(extracted);
  }
}

async function normalizeToIR(file: ExtractedFile): Promise<FileIntelIR> {
  const base: FileIntelIR = {
    fileId: file.fileId ?? createFileId(),
    fileName: file.fileName,
    fileType: file.fileType,
    sizeBytes: file.sizeBytes,
    structure: { type: "TEXT" },
    content: {},
    metadata: {
      extractedAt: Date.now(),
      warnings: file.warnings?.length ? file.warnings : undefined,
    },
  };

  switch (file.kind) {
    case "TEXT": {
      const text = await file.readText();
      base.structure.type = "TEXT";
      base.content.previewText = text.slice(0, 4000);
      break;
    }
    case "JSON": {
      const text = await file.readJsonText();
      base.structure.type = "TEXT";
      base.content.previewText = text.slice(0, 4000);
      break;
    }
    case "PDF": {
      const text = await file.readText();
      base.structure.type = "PDF";
      base.content.previewText = text.slice(0, 4000);
      break;
    }
    case "NOTEBOOK": {
      base.structure.type = "NOTEBOOK";
      base.content.cellsPreview = file.cells.slice(0, 50);
      break;
    }
    case "TABLE": {
      base.structure.type = "TABLE";
      const previews: any[] = [];

      for (const t of file.tables) {
        const it = t.rowIterator();
        const rowsPreview: Record<string, any>[] = [];
        let columns = t.columns;

        for (let i = 0; i < 20; i++) {
          const n = await it.next();
          if (n.done) break;
          if (!columns.length) columns = Object.keys(n.value ?? {});
          rowsPreview.push(n.value ?? {});
        }

        previews.push({
          sheet: t.sheet,
          columns,
          rowCount: t.rowCountEstimate,
          rowsPreview,
        });
      }

      base.structure.columns = previews[0]?.columns ?? [];
      base.structure.rows = previews[0]?.rowCount;
      base.content.tablesPreview = previews;
      break;
    }
    case "ARCHIVE": {
      base.structure.type = "ARCHIVE";
      base.content.nestedFiles = await Promise.all(file.entries.slice(0, 50).map((e) => normalizeToIR(e)));
      break;
    }
  }

  return base;
}

const MAX_SAMPLE_BYTES = 256 * 1024;
const MAX_SAMPLE_ROWS = 100;

async function readSampleBytes(localPath: string, maxBytes: number): Promise<Buffer> {
  const fh = await fs.open(localPath, "r");
  try {
    const buf = Buffer.allocUnsafe(maxBytes);
    const { bytesRead } = await fh.read(buf, 0, maxBytes, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

async function computeContentHash(file: ExtractedFile): Promise<string> {
  const h = crypto.createHash("sha256");
  h.update(`${file.fileName}|${file.sizeBytes}|${file.fileType}`);

  switch (file.kind) {
    case "TEXT":
    case "JSON":
    case "PDF": {
      if (typeof file.localPath === "string") {
        try {
          const sample = await readSampleBytes(file.localPath, MAX_SAMPLE_BYTES);
          h.update(sample);
        } catch {
          // best-effort
        }
      }
      h.update(String(file.sizeBytes));
      break;
    }
    case "NOTEBOOK": {
      const sample = file.cells.slice(0, MAX_SAMPLE_ROWS).join("\n");
      h.update(sample);
      h.update(String(file.cells.length));
      break;
    }
    case "TABLE": {
      for (const t of file.tables) {
        h.update(`sheet:${t.sheet ?? ""}`);
        h.update((t.columns ?? []).join(","));
        const it = t.rowIterator();
        let count = 0;
        while (count < MAX_SAMPLE_ROWS) {
          const n = await it.next();
          if (n.done) break;
          h.update(JSON.stringify(n.value ?? {}));
          count++;
        }
        const totalRows =
          typeof t.rowCountEstimate === "number"
            ? t.rowCountEstimate
            : count;
        h.update(String(totalRows));
        h.update(String((t.columns ?? []).length));
      }
      break;
    }
    case "ARCHIVE": {
      h.update(String(file.entries.length));
      for (const entry of file.entries) {
        h.update(entry.fileName);
        h.update(String(entry.sizeBytes));
      }
      break;
    }
  }

  return h.digest("hex");
}

function buildHumanSummary(irs: FileIntelIR[]): string {
  if (!irs.length) return "No files were processed.";
  const lines = irs.map((ir) => {
    const t = ir.structure.type;
    const extra =
      t === "TABLE" ? `cols=${ir.structure.columns?.length ?? 0}` :
      t === "NOTEBOOK" ? `cells=${ir.content.cellsPreview?.length ?? 0}` : "";
    return `- ${ir.fileName} (${t}${extra ? `, ${extra}` : ""})`;
  });
  return `FILE_INTELLIGENCE indexed ${irs.length} file(s):\n${lines.join("\n")}`;
}
