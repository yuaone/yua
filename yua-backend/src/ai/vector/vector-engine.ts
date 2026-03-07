// 📂 src/ai/vector/vector-engine.ts
// 🔥 YUA-AI VectorEngine — FINAL STABLE BUILD (2025.12)

import { createOpenAIEmbedder } from "./embedder";
import { pgPool } from "../../db/postgres";
import { mysqlPool } from "../../db/mysql";
import { log } from "../../utils/logger";

export class VectorEngine {
  static DIM = 1536;

  private embedder = process.env.OPENAI_API_KEY
    ? createOpenAIEmbedder(process.env.OPENAI_API_KEY)
    : null;

  pgTable = "vector_pg";
  mysqlTable = "yua_vectors";

  /* --------------------------------------------------------- */
  private extractTags(text: string): string[] {
    if (!text) return [];

    const keywords = [
      "세무","회계","리스크","지출","부가세","가공비",
      "매출","매입","보고서","월별","연간","잠재위험",
      "전표","증빙","기장","패턴","반복","탈세","차명",
      "접대","차량","비정상","리스크점수"
    ];

    const lower = text.toLowerCase();
    return keywords.filter(k => lower.includes(k.toLowerCase()));
  }

  /* --------------------------------------------------------- */
  async embedText(text: string): Promise<number[]> {
  if (!this.embedder) {
    return new Array(VectorEngine.DIM).fill(0);
  }

  const vectors = await this.embedder.embedTexts([text]);
  const vec = vectors?.[0];

  return Array.isArray(vec)
    ? vec
    : new Array(VectorEngine.DIM).fill(0);
  }

  /* --------------------------------------------------------- */
  private async upsertPg(id: string, vector: number[], meta: any) {
    try {
      // ✅ pgvector 전용 문자열 변환 (핵심)
      const pgVector = `[${vector.join(",")}]`;

      await pgPool.query(
        `
        INSERT INTO ${this.pgTable} (id, embedding, meta, created_at)
        VALUES ($1, $2::vector, $3::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET embedding = $2::vector, meta = $3::jsonb;
        `,
        [id, pgVector, meta]
      );

      return { ok: true, engine: "postgres" };
    } catch (err: any) {
      log("❌ [PG Upsert] " + err.message);
      return { ok: false };
    }
  }

  /* --------------------------------------------------------- */
  private async upsertMySQL(id: string, vector: number[], meta: any) {
    try {
      await mysqlPool.query(
        `
        INSERT INTO ${this.mysqlTable} (id, embedding, meta)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          embedding = VALUES(embedding),
          meta = VALUES(meta);
        `,
        [id, JSON.stringify(vector), JSON.stringify(meta)]
      );

      return { ok: true, engine: "mysql" };
    } catch (err: any) {
      log("❌ [MySQL Upsert] " + err.message);
      return { ok: false };
    }
  }

  /* --------------------------------------------------------- */
  async store(id: string, text: string, meta: any = {}) {
    const vector = await this.embedText(text);
    const tags = this.extractTags(text);

    const fullMeta = {
      ...meta,
      text,
      tags,
      updatedAt: Date.now(),
    };

    const pg = await this.upsertPg(id, vector, fullMeta);
    if (pg.ok) return pg;

    return await this.upsertMySQL(id, vector, fullMeta);
  }

  /* --------------------------------------------------------- */
  private async searchPg(queryVector: number[], limit: number) {
    try {
      // ✅ 여기서도 동일하게 문자열 변환
      const pgVector = `[${queryVector.join(",")}]`;

      const res = await pgPool.query(
        `
        SELECT id, meta, (embedding <#> $1::vector) AS score
        FROM ${this.pgTable}
        ORDER BY score ASC
        LIMIT $2;
        `,
        [pgVector, limit * 3]
      );

      return res.rows.map((row: any) => ({
        id: row.id,
        meta: row.meta,
        score: Number(row.score) || 0,
      }));
    } catch (err: any) {
      log("❌ [PG Search] " + err.message);
      return [];
    }
  }

  /* --------------------------------------------------------- */
  private async searchMySQL(queryVector: number[], limit: number) {
    try {
      const [rows]: any = await mysqlPool.query(
        `SELECT id, meta, embedding FROM ${this.mysqlTable} LIMIT ?;`,
        [limit * 5]
      );

      return rows
        .map((row: any) => {
          const emb = JSON.parse(row.embedding ?? "[]");
          const meta =
            typeof row.meta === "string" ? JSON.parse(row.meta) : row.meta;

          const score = this.cosineDistance(emb, queryVector);
          return { id: row.id, meta, score };
        })
        .sort((a: any, b: any) => a.score - b.score)
        .slice(0, limit * 3);
    } catch (err: any) {
      log("❌ [MySQL Search] " + err.message);
      return [];
    }
  }

  /* --------------------------------------------------------- */
  async search(query: string, limit = 5) {
    const qVec = await this.embedText(query);

    let results = await this.searchPg(qVec, limit);
    if (results.length === 0) {
      results = await this.searchMySQL(qVec, limit);
    }

    return results.slice(0, limit);
  }

  /* --------------------------------------------------------- */
  private cosineDistance(a: number[], b: number[]) {
    let dot = 0, na = 0, nb = 0;
    const len = Math.min(a.length, b.length);

    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }

    if (na === 0 || nb === 0) return 1;
    return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
  }
}
