// ============================================================
//  YUA ONE — BILLING RATE SSOT (FINAL VERSION)
//  절대 변경 X. 모든 엔진은 이 파일을 기준으로 동작함.
// ============================================================

export const InstanceRates = {
  cpu: {
    micro: 1,      // credits / hour
    small: 2,
    medium: 5,
    large: 10,
  },
  gpu: {
    standard: 30,
    advanced: 70,
  },
  qpu: {
    basic: 20,
    parallel: 60,
  },
  hqu: {
    cognitive: 120,
  }
};

export const ModelRates = {
  basic: 3,        // credits / 1M tokens
  pro: 6,
  enterprise: 12,  // 기본값 (엔터프라이즈는 custom override 가능)
};

export const SnapshotRates = {
  create: 5,
  restore: 5,
};

export const DiskRates = {
  resize: 0,
};
