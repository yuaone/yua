import { FileChunk } from "../types";
import { approxTokenEstimate } from "../utils/fs";

export function chunkText(input: { text: string; chunkChars?: number; overlapChars?: number }): FileChunk[] {
  const chunkChars = input.chunkChars ?? 4000;
  const overlapChars = input.overlapChars ?? 400;

  const text = input.text ?? "";
  if (!text.trim()) return [];

  const out: FileChunk[] = [];
  let i = 0;

  while (i < text.length) {
    const end = Math.min(text.length, i + chunkChars);
    const slice = text.slice(i, end);

    out.push({
      chunkIndex: 0, // will be re-numbered by adaptive chunker
      chunkType: "TEXT",
      content: slice,
      tokenEstimate: approxTokenEstimate(slice),
      metadata: { start: i, end },
    });

    if (end >= text.length) break;
    i = Math.max(0, end - overlapChars);
  }

  return out;
}
