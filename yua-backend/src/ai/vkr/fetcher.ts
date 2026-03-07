// src/ai/vkr/fetcher.ts

import crypto from "crypto";
import fetch from "node-fetch";
import { mysqlPool } from "../../db/mysql";

export async function fetchAndStoreDocument(
  sourceId: number,
  url: string
): Promise<string> {
  const res = await fetch(url, { timeout: 3000 });
  const text = await res.text();

  const clean = text.replace(/<[^>]+>/g, " ").slice(0, 20000);
  const hash = crypto.createHash("sha256").update(clean).digest("hex");

  await mysqlPool.query(
    `
    INSERT INTO vkr_documents (source_id, content, content_hash)
    VALUES (?, ?, ?)
    `,
    [sourceId, clean, hash]
  );

  return clean;
}
