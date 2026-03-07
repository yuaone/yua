import PDFDocument from "pdfkit";
import crypto from "crypto";
import { Storage } from "@google-cloud/storage";

const storage = new Storage();
const GCS_BUCKET = process.env.GCS_BUCKET_NAME!;
if (!GCS_BUCKET) throw new Error("GCS_BUCKET_NAME missing");

export async function renderMarkdownToPDF(args: {
  markdown: string;
  documentId: number;
  version: number;
}): Promise<{ uri: string; hash: string }> {
  const { markdown, documentId, version } = args;

  const doc = new PDFDocument({ autoFirstPage: true });
  const chunks: Buffer[] = [];

  doc.on("data", (c) => chunks.push(c));
  doc.fontSize(11).text(markdown, {
    width: 450,
    align: "left",
  });
  doc.end();

  const pdfBuffer = Buffer.concat(chunks);
  const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

  const objectName = `documents/${documentId}/v${version}.pdf`;
  const bucket = storage.bucket(GCS_BUCKET);
  const file = bucket.file(objectName);

  await file.save(pdfBuffer, {
    resumable: false,
    contentType: "application/pdf",
    metadata: { cacheControl: "private, max-age=0" },
  });

  return {
    uri: `gs://${GCS_BUCKET}/${objectName}`,
    hash,
  };
}
