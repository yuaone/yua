// 📂 src/ai/universal/plugins/index.ts
// 🔥 Plugin Engine — 범용 기능 호출 (2025.11 FINAL)

import { runProviderAuto } from "../../../service/provider-engine";
import { calcPlugin } from "./calc";
import { datePlugin } from "./date";
import { translatePlugin } from "./translate";

export const PluginEngine = {
  async try(message: string): Promise<string | null> {
    const text = message.trim();

    // 1) 계산 플러그인 (예: 계산: 3+7*2)
    if (text.startsWith("계산:")) {
      return calcPlugin(text.replace("계산:", "").trim());
    }

    // 2) 날짜 플러그인
    if (text.includes("오늘 날짜") || text.includes("오늘 날짜 알려줘")) {
      return datePlugin();
    }

    // 3) 번역 플러그인
    if (text.startsWith("번역:")) {
      const content = text.replace("번역:", "").trim();
      return await translatePlugin(content);
    }

    return null; // → 플러그인 대상이 아님 → UniversalEngine이 모델 호출
  }
};
