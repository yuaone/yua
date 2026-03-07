// 🔒 YUA SSOT — Metadata Sanitizer (PHASE 3)
// 목적: Raw Runtime / Judgment 메타데이터를
//       "학습 가능 + 비식별 + 저위험" 신호로 정제

import {
  RawSignal,
  EligibleSignal,
  isEligibleSignal,
} from "./signal-eligibility.policy";

export interface SanitizationResult {
  accepted: EligibleSignal[];
  rejected: RawSignal[];
}

export function sanitizeSignals(
  rawSignals: RawSignal[]
): SanitizationResult {
  const accepted: EligibleSignal[] = [];
  const rejected: RawSignal[] = [];

  for (const signal of rawSignals) {
    if (!signal || typeof signal !== "object") {
      rejected.push(signal);
      continue;
    }

    if (isEligibleSignal(signal)) {
      accepted.push({
        source: signal.source,
        type: signal.type,
        value: normalizeValue(signal.value),
      });
    } else {
      rejected.push(signal);
    }
  }

  return { accepted, rejected };
}

/* -------------------------------------------------- */
/* 🔧 Normalizer (방어적)                              */
/* -------------------------------------------------- */

function normalizeValue(
  value: number | string | boolean
): number | string | boolean {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return Number(value.toFixed(4)); // 과도한 정밀도 제거
  }

  if (typeof value === "string") {
    return value.trim().slice(0, 64);
  }

  return value;
}
