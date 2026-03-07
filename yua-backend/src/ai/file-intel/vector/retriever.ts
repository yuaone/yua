import { DbClient, getSessionIdByThread } from "./db";
import { Embedder, toPgvectorLiteral } from "./embedder";

export async function retrieveTopKByThread(args: {
  db: DbClient;
  embedder: Embedder;
  workspaceId: string;
  threadId: number;
  query: string;
  k?: number;
}): Promise<{ sessionId: string; chunks: string[]; scores: number[] } | null> {
  const sessionId = await getSessionIdByThread({
    db: args.db,
    workspaceId: args.workspaceId,
    threadId: args.threadId,
  });
  if (!sessionId) return null;

  const k = args.k ?? 5;
  const [vec] = await args.embedder.embedTexts([args.query]);
  const vecLit = toPgvectorLiteral(vec);

  const res = await args.db.query(
    `
    SELECT
      content,
      1 - (embedding <=> $1::vector) AS similarity
    FROM file_chunks
    WHERE session_id = $2
    ORDER BY embedding <=> $1::vector
    LIMIT $3
  `,
    [vecLit, sessionId, k]
  );

  const chunks: string[] = [];
  const scores: number[] = [];

  for (const r of res.rows ?? []) {
    chunks.push(String(r.content ?? ""));
    scores.push(Number(r.similarity ?? 0));
  }

  return { sessionId, chunks, scores };
}
