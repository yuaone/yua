// 📂 src/routes/v1-embeddings-router.ts
// OpenAI-compatible /v1/embeddings endpoint (proxy to OpenAI)

import { Router, Request, Response } from "express";
import { requireAuthOrApiKey } from "../auth/auth-or-apikey";
import { withWorkspace } from "../middleware/with-workspace";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// YUA model → OpenAI model + default dimensions
const MODEL_MAP: Record<string, { openaiModel: string; defaultDimensions: number }> = {
  "yua-embed-small": {
    openaiModel: "text-embedding-3-small",
    defaultDimensions: 1536,
  },
  "yua-embed-large": {
    openaiModel: "text-embedding-3-large",
    defaultDimensions: 3072,
  },
};

const MAX_BATCH_SIZE = 2048;
const MAX_TOKENS_PER_TEXT = 8192;

interface V1EmbeddingRequestBody {
  model?: string;
  input: string | string[];
  dimensions?: number;
  encoding_format?: "float" | "base64";
}

/**
 * POST /v1/embeddings
 * OpenAI-compatible embedding endpoint.
 */
router.post(
  "/embeddings",
  requireAuthOrApiKey,
  withWorkspace,
  async (req: Request, res: Response): Promise<Response | void> => {
    const startTime = Date.now();

    try {
      const body = req.body as V1EmbeddingRequestBody;

      // --- Validate model ---
      const modelName = body.model ?? "yua-embed-small";
      const mapped = MODEL_MAP[modelName];
      if (!mapped) {
        return res.status(400).json({
          error: {
            message: `Invalid model: ${modelName}. Supported: ${Object.keys(MODEL_MAP).join(", ")}`,
            type: "invalid_request_error",
            code: "invalid_model",
          },
        });
      }

      // --- Validate input ---
      if (!body.input) {
        return res.status(400).json({
          error: {
            message: "input is required",
            type: "invalid_request_error",
            code: "invalid_input",
          },
        });
      }

      const inputs: string[] = Array.isArray(body.input)
        ? body.input
        : [body.input];

      if (inputs.length === 0) {
        return res.status(400).json({
          error: {
            message: "input must not be empty",
            type: "invalid_request_error",
            code: "invalid_input",
          },
        });
      }

      if (inputs.length > MAX_BATCH_SIZE) {
        return res.status(400).json({
          error: {
            message: `Batch size ${inputs.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
            type: "invalid_request_error",
            code: "batch_too_large",
          },
        });
      }

      // Validate each input is a non-empty string
      for (let i = 0; i < inputs.length; i++) {
        if (typeof inputs[i] !== "string" || inputs[i].trim().length === 0) {
          return res.status(400).json({
            error: {
              message: `input[${i}] must be a non-empty string`,
              type: "invalid_request_error",
              code: "invalid_input",
            },
          });
        }
      }

      const dimensions = body.dimensions ?? mapped.defaultDimensions;
      const encodingFormat = body.encoding_format ?? "float";

      // --- Proxy to OpenAI ---
      const workspace = (req as any).workspace;
      const workspaceId: string = workspace?.id ?? "unknown";

      const openaiResponse = await openai.embeddings.create({
        model: mapped.openaiModel,
        input: inputs,
        dimensions,
        encoding_format: encodingFormat,
      });

      const latency = Date.now() - startTime;

      // Log usage
      console.log("[V1][EMBEDDINGS]", {
        workspace_id: workspaceId,
        model: modelName,
        openai_model: mapped.openaiModel,
        input_count: inputs.length,
        dimensions,
        prompt_tokens: openaiResponse.usage?.prompt_tokens ?? 0,
        total_tokens: openaiResponse.usage?.total_tokens ?? 0,
        latency_ms: latency,
      });

      // --- Reformat response with YUA model name ---
      const response = {
        object: "list" as const,
        model: modelName,
        data: openaiResponse.data.map((item) => ({
          object: "embedding" as const,
          index: item.index,
          embedding: item.embedding,
        })),
        usage: {
          prompt_tokens: openaiResponse.usage?.prompt_tokens ?? 0,
          total_tokens: openaiResponse.usage?.total_tokens ?? 0,
        },
      };

      return res.json(response);
    } catch (e: any) {
      const latency = Date.now() - startTime;
      console.error("[V1][EMBEDDINGS][ERROR]", {
        message: e?.message,
        status: e?.status,
        latency_ms: latency,
      });

      // Forward OpenAI errors with appropriate status
      if (e?.status && e?.message) {
        return res.status(e.status).json({
          error: {
            message: e.message,
            type: "upstream_error",
            code: "openai_error",
          },
        });
      }

      return res.status(500).json({
        error: {
          message: "Internal server error",
          type: "server_error",
          code: "internal_error",
        },
      });
    }
  }
);

export default router;
