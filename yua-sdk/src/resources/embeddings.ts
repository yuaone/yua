import type { APIClient } from "../core/api-client";
import type { EmbeddingCreateParams, EmbeddingResponse } from "../types/embedding";

export class Embeddings {
  constructor(private client: APIClient) {}

  /**
   * Create embeddings for the given input text(s).
   * OpenAI-compatible — uses the same response format.
   *
   * @example
   * const res = await yua.embeddings.create({
   *   model: "yua-embed-small",
   *   input: "Hello world",
   * });
   * console.log(res.data[0].embedding); // number[1536]
   */
  async create(params: EmbeddingCreateParams): Promise<EmbeddingResponse> {
    return this.client.post<EmbeddingResponse>("/api/v1/embeddings", params);
  }
}
