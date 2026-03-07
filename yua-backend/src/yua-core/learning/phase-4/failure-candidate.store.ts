// 🔒 YUA SSOT — Failure Candidate Store (PHASE 4)
// 목적: 후보는 "저장"만 가능, 활성화/적용 불가

import { FailureCandidate } from "./failure-candidate.model";

const inMemoryStore: FailureCandidate[] = [];

/**
 * ⚠️ 주의
 * - 이 Store는 학습 엔진이 아님
 * - 단순 기록용
 * - 삭제/수정/적용 API 없음 (SSOT)
 */

export const FailureCandidateStore = {
  add(candidate: FailureCandidate): void {
    inMemoryStore.push(candidate);
  },

  list(): ReadonlyArray<FailureCandidate> {
    return inMemoryStore;
  },

  count(): number {
    return inMemoryStore.length;
  },
};
