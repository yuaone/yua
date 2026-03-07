import OpenAI from "openai";
import crypto from "crypto";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/* -------------------------------------------------- */
/* Types                                              */
/* -------------------------------------------------- */

export type VisionTaskType =
  | "ocr"
  | "caption"
  | "scene"
  | "risk";

export interface VisionAnalyzeInput {
  imageBuffer: Buffer;
  mimeType: string;
  tasks: VisionTaskType[];
  pathMode: "FAST" | "NORMAL" | "DEEP";
}

export interface VisionAnalyzeResult {
  success: boolean;
  confidence: number;
  contextText?: string;
  failureCode?: VisionFailureCode;
  imageHash: string;
}

export type VisionFailureCode =
  | "VISION_LOW_CONFIDENCE"
  | "VISION_EMPTY_OUTPUT"
  | "VISION_PROVIDER_ERROR";

/* -------------------------------------------------- */
/* Utils                                              */
/* -------------------------------------------------- */

function hashImage(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function estimateConfidence(text: string): number {
  if (!text || text.trim().length === 0) return 0.0;
  if (text.length < 20) return 0.4;
  if (text.length < 80) return 0.6;
  return 0.85;
}

function sanitizeVisionOutput(raw: string): string {
  return raw
    .split("\n")
    .map(l => l.trim())
    .filter(
      l =>
        l.startsWith("OCR:") ||
        l.startsWith("CAPTION:") ||
        l.startsWith("SCENE:") ||
        l.startsWith("RISK:")
    )
    .join("\n");
}

/* -------------------------------------------------- */
/* Provider                                           */
/* -------------------------------------------------- */

export class OpenAIVisionProvider {
  static async analyze(
    input: VisionAnalyzeInput
  ): Promise<VisionAnalyzeResult> {
    const imageHash = hashImage(input.imageBuffer);

    try {
      const base64 = input.imageBuffer.toString("base64");
      const imageUrl = `data:${input.mimeType};base64,${base64}`;

      const instructions: string[] = [];

      if (input.tasks.includes("ocr")) {
        instructions.push(
          "OCR: Extract all visible text exactly as written. Do not infer missing characters."
        );
      }

      if (input.tasks.includes("caption")) {
        instructions.push(
          "CAPTION: Describe visible objects and layout factually. No emotions or intent."
        );
      }

      if (input.tasks.includes("scene")) {
        instructions.push(
          "SCENE: Describe environment type and spatial relations only if clearly visible."
        );
      }

      if (input.tasks.includes("risk")) {
        instructions.push(
          "RISK: Identify only explicit risk signals such as exposed credentials or unsafe equipment."
        );
      }

      const systemPrompt = `
You are a vision analysis engine.

Rules:
- No speculation.
- No guessing.
- If uncertain, omit the information.
- Do NOT judge, decide, advise, or recommend.

Output format:
OCR:
CAPTION:
SCENE:
RISK:

Only include sections you are confident about.
`.trim();

      /* -------------------------------------------------- */
      /* ✅ Responses API — TYPE SAFE WRAP                  */
      /* -------------------------------------------------- */

      const response = await client.responses.create({
        model: "gpt-4.1-mini",
        temperature: 0,

        // 🔒 SDK 타입 미반영 영역 → any 로 캡슐화
        input: [
          { type: "input_text", text: systemPrompt },
          { type: "input_text", text: instructions.join("\n") },
          { type: "input_image", image_url: imageUrl },
        ] as any,
      });

      const raw = response.output_text ?? "";
      const sanitized = sanitizeVisionOutput(raw);
      const confidence = estimateConfidence(sanitized);

      if (!sanitized) {
        return {
          success: false,
          confidence: 0,
          failureCode: "VISION_EMPTY_OUTPUT",
          imageHash,
        };
      }

      if (confidence < 0.5) {
        return {
          success: false,
          confidence,
          failureCode: "VISION_LOW_CONFIDENCE",
          imageHash,
        };
      }

      return {
        success: true,
        confidence,
        contextText: `
[VISION_CONTEXT START]
${sanitized}
[VISION_CONTEXT END]
`.trim(),
        imageHash,
      };
    } catch {
      return {
        success: false,
        confidence: 0,
        failureCode: "VISION_PROVIDER_ERROR",
        imageHash,
      };
    }
  }
}
