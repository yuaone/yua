// 📂 src/service/audio/audio-utils.ts
// 🎧 Audio Utils — Base64 + File + URL 통합 처리 (2025.11)

export function detectAudioType(input: any) {
  try {
    if (input?.base64) {
      return { ok: true, base64: extractBase64(input.base64) };
    }

    if (input?.file) {
      const base64 = input.file.buffer.toString("base64");
      return { ok: true, base64: `data:audio/wav;base64,${base64}` };
    }

    if (input?.url) {
      return { ok: true, base64: input.url };
    }

    return { ok: false, error: "음성 데이터가 없습니다." };
  } catch {
    return { ok: false, error: "Audio 처리 오류" };
  }
}

export function extractBase64(str: string): string {
  return str.replace(/^data:audio\/\w+;base64,/, "").trim();
}
