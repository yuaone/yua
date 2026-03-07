import crypto from "crypto";
import { Storage } from "@google-cloud/storage";

const GCS_BUCKET = process.env.GCS_BUCKET_NAME;
if (!GCS_BUCKET) {
  throw new Error("GCS_BUCKET_NAME is not defined");
}

const storage = new Storage();

export type DocumentSection = {
  order: number;
  type: string;
  title?: string;
  content: string;
};

export type WriteMarkdownResult = {
  uri: string;
  hash: string;
};

// 🔒 SSOT: sections → Markdown (TEXT 100% 보존)
export function sectionsToMarkdown(
  sections: DocumentSection[]
): string {
  const sorted = [...sections].sort(
    (a, b) => a.order - b.order
  );

  const lines: string[] = [];

  for (const s of sorted) {
    lines.push(`## ${s.type}`);

    if (s.title) {
      lines.push(`### ${s.title}`);
    }

    lines.push("");
    lines.push(s.content);
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

// 🔒 SSOT: Markdown → GCS
export async function writeMarkdownToGcs(
  markdown: string,
  options?: {
    workspaceId?: string;
    documentId?: number;
  }
): Promise<WriteMarkdownResult> {
  const hash = crypto
    .createHash("sha256")
    .update(markdown, "utf-8")
    .digest("hex");

  const objectName =
    options?.workspaceId && options?.documentId
      ? `documents/${options.workspaceId}/${options.documentId}/${hash}.md`
      : `documents/${hash}.md`;

  function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not defined`);
  return v;
}

const GCS_BUCKET = requireEnv("GCS_BUCKET_NAME");
const bucket = storage.bucket(GCS_BUCKET);
  const blob = bucket.file(objectName);

  await blob.save(markdown, {
    resumable: false,
    contentType: "text/markdown; charset=utf-8",
    metadata: {
      cacheControl: "no-store",
    },
  });

  return {
    uri: `https://storage.googleapis.com/${GCS_BUCKET}/${objectName}`,
    hash,
  };
}
