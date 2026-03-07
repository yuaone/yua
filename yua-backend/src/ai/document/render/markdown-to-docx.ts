import crypto from "crypto";
import { Document, Packer, Paragraph } from "docx";
import { Storage } from "@google-cloud/storage";

const storage = new Storage();
const GCS_BUCKET = process.env.GCS_BUCKET_NAME!;
if (!GCS_BUCKET) throw new Error("GCS_BUCKET_NAME missing");

export async function renderMarkdownToDOCX(args: {
  markdown: string;
  documentId: number;
  version: number;
}): Promise<{ uri: string; hash: string }> {
  const { markdown, documentId, version } = args;

  const paragraphs = markdown
    .split("\n")
    .map((line) => new Paragraph(line));

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  const buffer = await Packer.toBuffer(doc);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  const objectName = `documents/${documentId}/v${version}.docx`;
  const bucket = storage.bucket(GCS_BUCKET);
  const file = bucket.file(objectName);

  await file.save(buffer, {
    resumable: false,
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return {
    uri: `gs://${GCS_BUCKET}/${objectName}`,
    hash,
  };
}
