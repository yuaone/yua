/**
 * YUA Quant Service - Request/Response Contract (SSOT)
 * Backend <-> Quant Service 통신 계약
 */

/* =========================
   Actions
========================= */

export type QuantAction =
  | "analyze"    // 기술적 분석
  | "forecast"   // 시계열 예측
  | "simulate"   // Monte Carlo
  | "risk"       // 리스크 분석
  | "screen";    // 종목 스크리닝

/* =========================
   Request
========================= */

export type QuantRequest = {
  action: QuantAction;
  ticker: string;           // "005930.KS" (삼성전자), "AAPL"
  period?: string;          // "1mo", "3mo", "6mo", "1y", "2y" (default: "6mo")
  indicators?: string[];    // ["RSI", "MACD", "BB", "SMA", "EMA"]
  forecastDays?: number;    // forecast 전용: 예측 일수 (default: 30)
  simulations?: number;     // simulate 전용: MC 시뮬레이션 횟수 (default: 1000)
  screenFilters?: {         // screen 전용
    market?: "KRX" | "KOSPI" | "KOSDAQ" | "US";
    minVolume?: number;
    rsiBelow?: number;
    rsiAbove?: number;
  };
};

/* =========================
   Response - Technical Analysis
========================= */

export type IndicatorResult = {
  name: string;       // "RSI", "MACD", etc.
  value: number;
  signal?: string;    // "oversold", "overbought", "bullish_cross", "bearish_cross"
  description?: string;
};

export type AnalyzeResponse = {
  ticker: string;
  name?: string;
  currency?: string;
  currentPrice: number;
  change24h?: number;
  changePercent24h?: number;
  volume?: number;
  marketCap?: number;
  indicators: IndicatorResult[];
  summary: string;       // 1-2줄 요약 (LLM이 참고)
  dataPoints: number;    // 분석에 사용된 데이터 포인트 수
};

/* =========================
   Response - Forecast
========================= */

export type ForecastResponse = {
  ticker: string;
  model: string;         // "ARIMA", "Prophet"
  forecastDays: number;
  predictions: {
    date: string;        // "2026-03-07"
    predicted: number;
    lower: number;       // 95% CI
    upper: number;       // 95% CI
  }[];
  accuracy?: {
    mape?: number;       // Mean Absolute Percentage Error
    rmse?: number;
  };
  summary: string;
};

/* =========================
   Response - Monte Carlo Simulation
========================= */

export type SimulateResponse = {
  ticker: string;
  simulations: number;
  horizonDays: number;
  currentPrice: number;
  results: {
    mean: number;
    median: number;
    p5: number;          // 5th percentile (worst case)
    p25: number;
    p75: number;
    p95: number;         // 95th percentile (best case)
    probUp: number;      // 상승 확률 (0~1)
    probDown: number;    // 하락 확률 (0~1)
    maxDrawdown: number; // 최대 하락폭 %
  };
  summary: string;
};

/* =========================
   Response - Risk Analysis
========================= */

export type RiskResponse = {
  ticker: string;
  period: string;
  volatility: number;          // 연간 변동성
  sharpeRatio?: number;
  beta?: number;               // vs market index
  var95: number;               // 95% Value at Risk (daily)
  maxDrawdown: number;
  summary: string;
};

/* =========================
   Unified Response
========================= */

export type QuantResponse = {
  ok: boolean;
  action: QuantAction;
  error?: string;
  data?: AnalyzeResponse | ForecastResponse | SimulateResponse | RiskResponse | any;
  disclaimer: string;   // 면책 조항 (항상 포함)
};
