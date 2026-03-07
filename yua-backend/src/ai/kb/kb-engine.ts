// 📂 src/ai/kb/kb-engine.ts
// 🔥 YA-ENGINE KB Search Engine — FINAL ENTERPRISE VERSION (2025.11)
// ------------------------------------------------------------------
// ✔ Workflow / Developer Console / ChatEngine 모두 호환
// ✔ Tag 기반 확장형 KB 구조
// ✔ strict mode 완전 대응
// ------------------------------------------------------------------

import { log } from "../../utils/logger";

export class KBEngine {
  private static KB: Record<string, string> = {
    "yua": "YUA-AI 엔진은 multi-provider + workflow 기반 AI 시스템입니다.",
    "workflow": "Workflow는 노드/엣지 기반 GPT 자동화 파이프라인입니다.",
    "provider": "ProviderEngine은 GPT / Gemini / Claude 중 자동 선택됩니다.",
  };

  static async search(query: string): Promise<string> {
    log(`🔍 KB Search: ${query}`);

    if (!query?.trim()) return "검색어가 비어있습니다.";

    const key = query.toLowerCase();

    if (KBEngine.KB[key]) return KBEngine.KB[key];

    return "🔎 검색 결과 없음";
  }
}

export { KBEngine as default };
