import OpenAI from "openai";

export type TTSOptions = {
  model?: "gpt-4o-mini-tts" | string;
  voice?: string; // alloy 등
  /**
   * OpenAI Speech API response_format
   * "pcm" = 24kHz 16bit signed little-endian raw PCM
   */
  responseFormat?: "mp3" | "wav" | "pcm";
  speed?: number; // 0.25 ~ 4.0
  /**
   * 톤/말투를 강하게 잡고 싶을 때 사용하는 "스타일 힌트"
   * (실존 인물 모사 금지 / 일반적 스타일만)
   */
  instructions?: string;
  signal?: AbortSignal;
};

export type TTSResult = {
  buffer: Buffer;
  mimeType: string;
};

function requireApiKey() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY_NOT_SET");
  return process.env.OPENAI_API_KEY!;
}
function normalizeForTTS(text: string) {
  // 너무 긴 문장은 TTS 품질/지연에 악영향 → 안전 컷
  // (나중에 필요하면 chunking으로 확장)
  const s = String(text ?? "").trim();
  const MAX = 900; // 경험상 600~1200 사이가 무난. 지금은 보수적으로.
  if (s.length <= MAX) return s;
  return s.slice(0, MAX).trim() + "…";
}

function defaultIdolStyle() {
  // "여자톤/20살 아이돌 느낌" = 말투/리듬/발음/감정선을 텍스트로 제어
  // ※ 특정 실존 인물 따라하기 금지
  return [
    "Korean-first.",
    "Sound like a youthful, bright, energetic K-pop idol vibe (generic, not any real person).",
    "Keep it cute, upbeat, and confident.",
    "Speak clearly with short sentences.",
    "Avoid slang that feels too old or too childish; aim for trendy but clean.",
    "Use friendly honorifics lightly (예: ~요), not too formal.",
  ].join(" ");
}
export class TTSService {
  private client = new OpenAI({ apiKey: requireApiKey() });

  async synthesize(text: string, opts: TTSOptions = {}): Promise<TTSResult> {
    const input = normalizeForTTS(text);
    if (!input) throw new Error("TTS_EMPTY_TEXT");

    const responseFormat = opts.responseFormat ?? "mp3";

    const voice = opts.voice ?? process.env.OPENAI_TTS_VOICE ?? "alloy";

    // 하이텐션/또렷함: 기본 speed를 살짝 올리되, 과하면 인위적이라 1.08 정도
    const speed =
      typeof opts.speed === "number"
        ? opts.speed
        : process.env.OPENAI_TTS_SPEED
          ? Number(process.env.OPENAI_TTS_SPEED)
          : 1.08;

    const response = await this.client.audio.speech.create(
      {
        model: opts.model ?? "gpt-4o-mini-tts",
        voice,
        // 최신 TTS 계열은 instruction/style 같은 필드가 지원되는 경우가 많아.
        // SDK 타입이 엄격해서 any로 넣어도 되고, 서버에선 무시되면 그냥 input만으로 동작.
        // (안 되면 style 제거하고 "input 전처리"로만도 꽤 톤이 잡힘)
        instructions:
          opts.instructions ??
          process.env.OPENAI_TTS_STYLE ??
          defaultIdolStyle(),
        input: input,
        response_format: responseFormat,
        speed,
      } as any,
      opts.signal ? { signal: opts.signal } : undefined
    );

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      buffer,
      mimeType:
        responseFormat === "wav"
          ? "audio/wav"
          : responseFormat === "pcm"
          ? "audio/pcm"
          : "audio/mpeg",
    };
  }
}