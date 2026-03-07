// 📂 src/ai/universal/plugins/translate.ts
// 🌐 번역 플러그인 (ProviderAuto 사용)

import { runProviderAuto } from "../../../service/provider-engine";
import { toStringSafe } from "../utils-safe"; // 안전 변환 재사용

export async function translatePlugin(text: string): Promise<string> {
  const prompt = `
다음 문장을 자연스럽게 번역해줘.
언어는 자동 감지 후 한국어 또는 영어로 번역.

문장:
${text}
  `.trim();

  const raw = await runProviderAuto(prompt);
  return toStringSafe(raw) || "번역 실패";
}
