// --- Embedding types (OpenAI-compatible) ---

export type EmbeddingModel =
  | "yua-embed-nano"
  | "yua-embed-small"
  | "yua-embed-large"
  | "yua-embed-kr"
  | (string & {});

export interface EmbeddingCreateParams {
  model: EmbeddingModel;
  input: string | string[];
  dimensions?: number;
  encoding_format?: "float" | "base64";
}

export interface EmbeddingObject {
  object: "embedding";
  index: number;
  embedding: number[];
}

export interface EmbeddingResponse {
  object: "list";
  model: string;
  data: EmbeddingObject[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
