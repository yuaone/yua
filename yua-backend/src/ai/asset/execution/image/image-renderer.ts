// 🔥 Image Renderer — PHASE 3 (PIPELINE AWARE, GCS FINAL)

import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { IMAGE_PRESETS } from "./image-presets";
import type { ImageSpec } from "../../canonical/image-spec.types";
import { transformPipeline } from "./transform-pipeline";
import { composePipeline } from "./compose-pipeline";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/* --------------------------------------------------
 * GCS Setup
 * -------------------------------------------------- */

const LOCAL_ASSET_ROOT = "/mnt/yua/assets";

/* --------------------------------------------------
 * OpenAI Size
 * -------------------------------------------------- */

type OpenAIImageSize =
  | "256x256"
  | "512x512"
  | "1024x1024"
  | "1792x1024"
  | "1024x1792";

/* --------------------------------------------------
 * Size Resolver
 * -------------------------------------------------- */

function resolveSize(spec: ImageSpec): OpenAIImageSize {
  const preset = IMAGE_PRESETS[spec.preset];
  const { width, height } = preset;

  if (width === height) {
    if (width <= 256) return "256x256";
    if (width <= 512) return "512x512";
    return "1024x1024";
  }

  return width > height ? "1792x1024" : "1024x1792";
}

/* --------------------------------------------------
 * Entry (UNCHANGED CONTRACT)
 * -------------------------------------------------- */

export async function renderImage(params: {
  spec: ImageSpec;
  outputPath: string; // ⚠️ 논리 키 (파일 경로 아님)
}): Promise<string> {
  const { spec, outputPath } = params;
  const localOutputPath = path.resolve(LOCAL_ASSET_ROOT, outputPath);

  console.log("[IMAGE_RENDERER][ENTER]", {
    mode: spec.mode,
    preset: spec.preset,
    outputPath,
  });

  switch (spec.mode) {
    case "GENERATE":
      return generateFromPrompt(spec, outputPath);

    case "TRANSFORM": {
      const out = await transformPipeline({
        spec,
        outputPath: localOutputPath,
      });
      return `file://${out}`;
    }

    case "COMPOSE": {
      const out = await composePipeline({
        spec,
        outputPath: localOutputPath,
      });
      return `file://${out}`;
    }

    default: {
      const _never: never = spec.mode;
      throw new Error(`UNSUPPORTED_IMAGE_MODE:${_never}`);
    }
  }
}

/* --------------------------------------------------
 * GENERATE
 * -------------------------------------------------- */

async function generateFromPrompt(
  spec: ImageSpec,
  outputPath: string
): Promise<string> {
  if (!spec.prompt) {
    throw new Error("IMAGE_PROMPT_REQUIRED");
  }

  console.log("[IMAGE_RENDERER][GENERATE][OPENAI_REQUEST]", {
    size: resolveSize(spec),
    background: spec.background,
  });

  const result = await client.images.generate({
    model: "gpt-image-1",
    prompt: spec.prompt,
    size: resolveSize(spec),
    background:
      spec.background === "TRANSPARENT"
        ? "transparent"
        : undefined,
  });

  return writeResultImage(result, outputPath);
}

/* --------------------------------------------------
 * Writer — b64 → GCS → HTTPS (SSOT)
 * -------------------------------------------------- */

async function writeResultImage(
  result: any,
  outputPath: string
): Promise<string> {
  if (!result.data?.length) {
    console.error("[IMAGE_RENDERER][EMPTY_RESULT]", result);
    throw new Error("IMAGE_GENERATION_EMPTY_RESULT");
  }

  const imageBase64 = result.data[0]?.b64_json;
  if (!imageBase64) {
    console.error("[IMAGE_RENDERER][NO_BASE64]", result.data[0]);
    throw new Error("IMAGE_BASE64_MISSING");
  }

  // 1️⃣ base64 → buffer
  const buffer = Buffer.from(imageBase64, "base64");

  // 2️⃣ hash (dedupe / cache key)
  const hash = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

  // 3️⃣ local path
  const dir = path.join(LOCAL_ASSET_ROOT, "rendered");
  const filePath = path.join(dir, `${hash}.png`);
  await fs.mkdir(dir, { recursive: true });

  console.log("[IMAGE_RENDERER][WRITE][LOCAL]", {
    filePath,
    size: buffer.length,
  });

  // 4️⃣ write
  await fs.writeFile(filePath, buffer);

  const url = `file://${filePath}`;

  console.log("[IMAGE_RENDERER][DONE]", {
    url,
  });

  return url;
}
