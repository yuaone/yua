// 📂 src/models/solar-report.model.ts
// 🔥 Solar Report Data Model — FINAL ENTERPRISE VERSION (2025.11)
// ✔ 세무/회계/기업 기존 ReportEngine과 100% 충돌 없음
// ✔ 발전량·수익·ROI·IRR·비용·고객정보 완전 통합 구조
// ✔ PDF/AI/DB 모든 영역에서 호환되는 산업용 스키마

export interface SolarClientInfo {
  name: string;
  phone?: string;
  address?: string;
  buildingType?: string;   // 주택/공장/창고/상가 등
  area?: number;           // 설치 면적(m2)
}

export interface SolarSystemSpec {
  panelWatt: number;       // 패널 W (예: 460W)
  panelCount: number;      // 패널 개수
  capacityKW: number;      // 설비 용량 kW
  angle: number;           // 설치 각도
  direction: string;       // 남향/남동향/남서향 등
  lossFactor?: number;     // 손실 계수 (0.80~0.90)
  region: string;          // 지역명 (일사량 매칭용)
}

export interface SolarCostInfo {
  equipmentCost: number;   // 장비비용
  installCost: number;     // 시공비
  inverterCost: number;    // 인버터 비용
  structureCost: number;   // 구조물 비용
  etcCost?: number;        // 기타비용
  totalInitialCost: number; // 총 설치비
}

export interface SolarYieldResult {
  dailyKwh: number;        // 일 발전량
  monthlyKwh: number;      // 월 발전량
  yearlyKwh: number;       // 연 발전량
  degradationRate: number; // 연간 노화율(%)
}

export interface SolarProfitResult {
  monthlyProfit: number;   // 월 수익
  yearlyProfit: number;    // 연간 수익
  total20yr: number;       // 20년 누적 수익
  smpPrice: number;        // SMP 단가
  recPrice: number;        // REC 단가
}

export interface SolarFinanceResult {
  roi: number;             // 투자수익률 (%)
  irr: number;             // 내부수익률
  paybackPeriod: number;   // 투자 회수 기간(개월)
  cashflow: number[];      // 20년간 연도별 현금흐름
}

export interface SolarRiskResult {
  warnings: string[];      // 위험요소 (발전량 급감/고장/각도 이상 등)
}

export interface SolarReport {
  ok: boolean;
  engine: "solar";

  client: SolarClientInfo;
  system: SolarSystemSpec;
  cost: SolarCostInfo;

  yield: SolarYieldResult;     // 발전량 분석
  profit: SolarProfitResult;   // 수익 분석
  finance: SolarFinanceResult; // ROI/IRR/회수기간
  risk: SolarRiskResult;       // 위험 분석

  aiSummary: string;           // AI 요약 설명
  aiRecommendation: string;    // AI 최종 추천 문장

  createdAt: string;           // ISO 날짜
}
