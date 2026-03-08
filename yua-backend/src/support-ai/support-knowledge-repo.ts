import { pgPool } from "../db/postgres";
import type { SupportKnowledgeEntry } from "yua-shared";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI embedding API error (${res.status}): ${errBody}`);
  }

  const json = await res.json();
  return json.data[0].embedding;
}

export const SupportKnowledgeRepo = {
  /**
   * Paginated list of active knowledge entries.
   */
  async list(
    category?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ entries: SupportKnowledgeEntry[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      const conditions: string[] = ["is_active = true"];
      const params: any[] = [];

      if (category) {
        params.push(category);
        conditions.push(`category = $${params.length}`);
      }

      const where = conditions.join(" AND ");

      const countResult = await pgPool.query(
        `SELECT COUNT(*)::int AS total FROM support_knowledge WHERE ${where}`,
        params,
      );

      const dataParams = [...params, limit, offset];
      const rows = await pgPool.query(
        `SELECT id, category, question, answer, is_active, created_by, created_at, updated_at
         FROM support_knowledge
         WHERE ${where}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        dataParams,
      );

      return { entries: rows.rows, total: countResult.rows[0].total };
    } catch (err) {
      console.error("[SupportKnowledgeRepo.list] error:", err);
      throw err;
    }
  },

  /**
   * Get a single entry by ID.
   */
  async getById(id: number): Promise<SupportKnowledgeEntry | null> {
    try {
      const result = await pgPool.query(
        `SELECT id, category, question, answer, is_active, created_by, created_at, updated_at
         FROM support_knowledge WHERE id = $1`,
        [id],
      );
      return result.rows[0] ?? null;
    } catch (err) {
      console.error("[SupportKnowledgeRepo.getById] error:", err);
      throw err;
    }
  },

  /**
   * Create a new knowledge entry. Embedding is generated asynchronously.
   */
  async create(data: {
    category: string;
    question: string;
    answer: string;
    created_by?: number;
  }): Promise<SupportKnowledgeEntry> {
    try {
      const result = await pgPool.query(
        `INSERT INTO support_knowledge (category, question, answer, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id, category, question, answer, is_active, created_by, created_at, updated_at`,
        [data.category, data.question, data.answer, data.created_by ?? null],
      );

      const row = result.rows[0];

      // Generate embedding asynchronously — don't block the response
      const embeddingText = `${data.question}\n${data.answer}`;
      generateEmbedding(embeddingText)
        .then(async (embedding) => {
          await pgPool.query(
            `UPDATE support_knowledge SET embedding = $1::vector, updated_at = NOW() WHERE id = $2`,
            [JSON.stringify(embedding), row.id],
          );
        })
        .catch((err) => {
          console.error(
            `[SupportKnowledgeRepo.create] embedding generation failed for id=${row.id}:`,
            err,
          );
        });

      return row;
    } catch (err) {
      console.error("[SupportKnowledgeRepo.create] error:", err);
      throw err;
    }
  },

  /**
   * Update an existing knowledge entry. Re-embeds if question or answer changed.
   */
  async update(
    id: number,
    data: Partial<{
      category: string;
      question: string;
      answer: string;
      is_active: boolean;
    }>,
  ): Promise<SupportKnowledgeEntry | null> {
    try {
      const fields: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      if (data.category !== undefined) {
        fields.push(`category = $${paramIdx++}`);
        params.push(data.category);
      }
      if (data.question !== undefined) {
        fields.push(`question = $${paramIdx++}`);
        params.push(data.question);
      }
      if (data.answer !== undefined) {
        fields.push(`answer = $${paramIdx++}`);
        params.push(data.answer);
      }
      if (data.is_active !== undefined) {
        fields.push(`is_active = $${paramIdx++}`);
        params.push(data.is_active);
      }

      if (fields.length === 0) return this.getById(id);

      fields.push(`updated_at = NOW()`);
      params.push(id);

      const result = await pgPool.query(
        `UPDATE support_knowledge SET ${fields.join(", ")} WHERE id = $${paramIdx}
         RETURNING id, category, question, answer, is_active, created_by, created_at, updated_at`,
        params,
      );

      const row = result.rows[0];
      if (!row) return null;

      // Re-embed if question or answer changed
      const needsReEmbed =
        data.question !== undefined || data.answer !== undefined;
      if (needsReEmbed) {
        const embeddingText = `${row.question}\n${row.answer}`;
        generateEmbedding(embeddingText)
          .then(async (embedding) => {
            await pgPool.query(
              `UPDATE support_knowledge SET embedding = $1::vector, updated_at = NOW() WHERE id = $2`,
              [JSON.stringify(embedding), id],
            );
          })
          .catch((err) => {
            console.error(
              `[SupportKnowledgeRepo.update] re-embedding failed for id=${id}:`,
              err,
            );
          });
      }

      return row;
    } catch (err) {
      console.error("[SupportKnowledgeRepo.update] error:", err);
      throw err;
    }
  },

  /**
   * Soft-delete by setting is_active = false.
   */
  async softDelete(id: number): Promise<boolean> {
    try {
      const result = await pgPool.query(
        `UPDATE support_knowledge SET is_active = false, updated_at = NOW() WHERE id = $1`,
        [id],
      );
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      console.error("[SupportKnowledgeRepo.softDelete] error:", err);
      throw err;
    }
  },

  /**
   * Semantic search using pgvector cosine similarity.
   */
  async search(
    queryEmbedding: number[],
    limit: number = 5,
    threshold: number = 0.7,
  ): Promise<Array<{ id: number; category: string; question: string; answer: string; similarity: number }>> {
    try {
      const result = await pgPool.query(
        `SELECT id, category, question, answer, 1 - (embedding <=> $1::vector) AS similarity
         FROM support_knowledge
         WHERE is_active = true AND embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [JSON.stringify(queryEmbedding), limit],
      );

      // Filter by threshold in code
      return result.rows.filter(
        (row: { similarity: number }) => row.similarity >= threshold,
      );
    } catch (err) {
      console.error("[SupportKnowledgeRepo.search] error:", err);
      throw err;
    }
  },

  /**
   * Generate an embedding for the given text via OpenAI API.
   */
  generateEmbedding,
};
