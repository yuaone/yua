import { spawn } from "child_process";
import crypto from "crypto";
import { Storage } from "@google-cloud/storage";
import fs from "fs";

const storage = new Storage();
const BUCKET = process.env.GCS_BUCKET_NAME!;
const LAYOUT_VERSION = "v1-fixed-60-40";

/**
 * 🔒 COMPOSITE IMAGE (SSOT FINAL)
 * - TOP    60% : FACTUAL_VISUALIZATION
 * - BOTTOM 40% : SEMANTIC_IMAGE
 */
export async function composeCompositeImage(args: {
  sectionId: number;
  factualUri: string;
  semanticUri: string;
  caption?: string;
}): Promise<{ uri: string; hash: string }> {
  const outFile = `out-${args.sectionId}.png`;

  const script = `
from PIL import Image, ImageDraw
import requests
from io import BytesIO

def load(uri):
    return Image.open(BytesIO(requests.get(uri).content)).convert("RGBA")

factual = load("${args.factualUri}")
semantic = load("${args.semanticUri}")

WIDTH = max(factual.width, semantic.width)
FACT_H = int(factual.height * 0.6)
SEM_H  = int(semantic.height * 0.4)
HEIGHT = FACT_H + SEM_H + 80

canvas = Image.new("RGBA", (WIDTH, HEIGHT), (255,255,255,255))
draw = ImageDraw.Draw(canvas)

# --- FACTUAL ---
fact = factual.resize((int(WIDTH * 0.9), FACT_H), Image.LANCZOS)
fx = (WIDTH - fact.width) // 2
canvas.paste(fact, (fx, 40))

# --- CAPTION ---
caption = "${args.caption ?? ""}"
if caption:
    draw.text((fx, 10), caption, fill=(0,0,0,255))

# --- SEMANTIC ---
sem = semantic.resize((int(WIDTH * 0.9), SEM_H), Image.LANCZOS)
sx = (WIDTH - sem.width) // 2
canvas.paste(sem, (sx, FACT_H + 40))

canvas.save("${outFile}")
`;

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("python3", ["-c", script]);
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error("PY_COMPOSITE_FAILED"))
    );
  });

  const buffer = fs.readFileSync(outFile);

  const hash = crypto
    .createHash("sha256")
    .update(buffer)
    .update(LAYOUT_VERSION)
    .digest("hex");

  const objectName = `composite/section-${args.sectionId}-${hash}.png`;
  await storage.bucket(BUCKET).file(objectName).save(buffer, {
    contentType: "image/png",
  });

  return {
    uri: `gs://${BUCKET}/${objectName}`,
    hash,
  };
}
