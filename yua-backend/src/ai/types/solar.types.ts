// 📂 src/ai/types/solar.types.ts
// 🔥 SolarEngine 타입 정의 — INDUSTRIAL B VERSION (2025.11)
// ✔ 기본세트 + 상업/주택 분기 + SMP/REC 구조 포함
// ✔ 세무/회계/기업 로직과 100% 독립

export type SolarInstallType = "residential" | "commercial";

export interface SolarInput {
  // 기본 세트
  region: string;            // 지역명
  moduleWatt: number;        // 모듈 단일 용량 (W)
  moduleCount: number;       // 모듈 개수
  installCapacity: number;   // 설치 용량(kW) = 계산 가능하지만 수동 입력도 허용
  angle: number;             // 설치각도 (deg)
  direction: string;         // 설치 방향 (남/남동/남서 등)
  area: number;              // 설치 면적(m²)
  panelEfficiency: number;   // 패널 효율(%)
  tempCoeff: number;         // 온도계수
  inverterEfficiency: number;// 인버터 효율(%)
  installCost: number;       // 설치비용
  omCost: number;            // 연간 유지보수 비용
  lossRate: number;          // 발전손실률(%)

  // 선택 3) 상업/주택 분기
  installType: SolarInstallType;

  // 선택 4) SMP/REC
  smpPrice: number;          // SMP 단가(원/kWh)
  recPrice: number;          // REC 단가(원/kWh)
}

export interface SolarOutput {
  ok: boolean;

  // 발전량
  dailyGeneration: number;
  monthlyGeneration: number;
  yearlyGeneration: number;

  // 수익
  monthlyRevenue: number;
  yearlyRevenue: number;
  roiYears: number;          // 투자 회수 기간(년)

  // 20년 예측
  degradation: number;
  forecast20Years: number[];

  // 분기 정보
  installType: SolarInstallType;

  // 기타
  summary: string;
}
