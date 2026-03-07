// 📂 src/ai/signals/yua-signal.types.ts
// 🔒 YUA Signal Type (SSOT)

export interface YuaSignal {
  origin: string;          // 어떤 Solver에서 왔는지
  value: number;           // 정규화된 핵심 값 (0~1 or 의미 있는 스칼라)
  confidence: number;      // 이 수치를 얼마나 믿을 수 있는가
  volatility: number;      // 변동성
  sampleSize?: number;     // 표본 수 (있으면)
  timestamp: string;
  metadata: Record<string, any>;
}
