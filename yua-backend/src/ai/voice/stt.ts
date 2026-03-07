import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";

export type STTResult = {
  text: string;
  language?: string;
  durationSeconds?: number;
  usage?: unknown;
};

function requireApiKey() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_NOT_SET");
  return process.env.OPENAI_API_KEY!;
}

export class STTService {
  private client = new OpenAI({ apiKey: requireApiKey() });

  async transcribeFile(args: {
    filePath: string;
    model?: "gpt-4o-mini-transcribe" | "gpt-4o-transcribe" | "whisper-1";
    language?: string; // "ko"
    signal?: AbortSignal;
  }): Promise<STTResult> {
    if (!fs.existsSync(args.filePath)) throw new Error("STT_FILE_NOT_FOUND");

    const stream = fs.createReadStream(args.filePath);

    const res: any = await this.client.audio.transcriptions.create(
      {
        file: stream as any,
        model: args.model ?? "gpt-4o-mini-transcribe",
        language: args.language ?? "ko",
        response_format: "verbose_json",
      } as any,
      args.signal ? { signal: args.signal } : undefined
    );

    return {
      text: String(res?.text ?? "").trim(),
      language: res?.language,
      durationSeconds: res?.duration,
      usage: res?.usage,
    };
  }

  // multer memoryStorage 대비: buffer → temp file → stream
  async transcribeBuffer(args: {
    buffer: Buffer;
    filename: string;
    ext: string; // "webm"|"wav"|"mp3"...
    model?: "gpt-4o-mini-transcribe" | "gpt-4o-transcribe" | "whisper-1";
    language?: string;
    signal?: AbortSignal;
  }): Promise<STTResult> {
    const safeName = path.basename(args.filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const tmp = path.join(os.tmpdir(), `yua-stt-${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`);
    await fs.promises.writeFile(tmp, args.buffer);
    try {
      return await this.transcribeFile({
        filePath: tmp,
        model: args.model,
        language: args.language,
        signal: args.signal,
      });
    } finally {
      fs.promises.unlink(tmp).catch(() => {});
    }
  }
}