// src/ai/image/render/openai-image-renderer.ts

import OpenAI from "openai";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const LOCAL_ASSET_ROOT = "/mnt/yua/assets";

export async function renderSemanticImage(scene: any): Promise<{
  url: string;
  hash: string;
}> {
  console.log("[IMAGE][SEMANTIC][ENTER]");

  /**
   * 🔒 SSOT IMAGE PROMPT — CONTRACT MODE
   * 목적:
   * - 실패 확률 감소
   * - 인체 / 손 / 포즈 안정성 강제
   * - 스타일 자유도 제한
   */
  const prompt = `
You are generating a high-fidelity, realistic image.

HARD CONSTRAINTS (must not violate):
- Anatomically correct human proportions
- Correct number of fingers on each hand (5)
- No twisted limbs or broken joints
- Stable posture with natural body balance
- No cropped or missing body parts
- No motion blur
- No abstract or cartoon-like distortion
- No placeholder, icon, or avatar-style rendering

RENDERING REQUIREMENTS:
- Sharp focus
- Clean lighting
- Professional, production-quality output
- Realistic depth and perspective

SCENE DEFINITION (do not reinterpret):
${JSON.stringify(scene, null, 2)}

If any constraint cannot be satisfied, generate the closest valid realistic image
without introducing distortions.
`;

  console.log("[IMAGE][SEMANTIC][OPENAI_REQUEST]", {
    promptLength: prompt.length,
  });

  const result = await client.images.generate({
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
  });

  const image = result.data?.[0];

  // 🔴 OpenAI 응답 검증 (여기서 실패하면 OpenAI 문제)
  if (!image?.b64_json) {
    console.error("[IMAGE][SEMANTIC][OPENAI_EMPTY_RESULT]", {
      hasData: Boolean(result.data),
      firstItem: image,
    });
    throw new Error("OPENAI_IMAGE_GENERATION_FAILED");
  }

  console.log("[IMAGE][SEMANTIC][OPENAI_OK]", {
    hasBase64: true,
  });

  // 1️⃣ base64 → buffer
  const buffer = Buffer.from(image.b64_json, "base64");

  // 2️⃣ content hash (SSOT / dedupe key)
  const hash = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

  // 3️⃣ local path
  const dir = path.join(LOCAL_ASSET_ROOT, "semantic");
  const filePath = path.join(dir, `${hash}.png`);
  await fs.mkdir(dir, { recursive: true });

  console.log("[IMAGE][SEMANTIC][LOCAL_WRITE_START]", {
    filePath,
    sizeBytes: buffer.length,
  });

  // 4️⃣ write to local storage
  await fs.writeFile(filePath, buffer);

  const url = `file://${filePath}`;

  console.log("[IMAGE][SEMANTIC][DONE]", {
    url,
    hash,
  });

  return {
    url,
    hash,
  };
}
