// 📡 Depth Estimator — Enterprise Version
// -----------------------------------------------------------
// ✔ 프레임 기반 거리 추정 (bounding box)
// ✔ IR intensity 기반 거리 보정
// ✔ Vision landmark 기반 Z-depth
// ✔ EMA smoothing
// ✔ 스파이크 제거
// ✔ 위험도 계산
// -----------------------------------------------------------

export const DepthEstimator = {
  prevDistance: 0,
  alpha: 0.25, // EMA smoothing

  clamp(v: number, min = 0.05, max = 1.5) {
    return Math.max(min, Math.min(max, v));
  },

  ema(prev: number, curr: number) {
    return prev * (1 - this.alpha) + curr * this.alpha;
  },

  removeSpike(prev: number, curr: number) {
    if (Math.abs(prev - curr) > 0.7) {
      // 급격한 스파이크 → 완만하게 이동
      return prev + Math.sign(curr - prev) * 0.3;
    }
    return curr;
  },

  calculateRisk(distance: number) {
    if (distance < 0.15) return 90;   // 너무 가까움 → 위험
    if (distance < 0.25) return 60;
    if (distance < 0.4) return 30;
    return 0;
  },

  /**
   * frame: {
   *    handBox: { width, height }
   *    ir: number
   *    zDepth: number
   * }
   */
  getDistance(frame: {
    handBox?: { width: number; height: number };
    ir?: number;
    zDepth?: number;
  }) {
    let estimate = 0.5; // 기본값 (50cm)

    // 1) Hand bounding box 기반 거리 추정
    if (frame.handBox) {
      const { width, height } = frame.handBox;
      const size = (width + height) / 2;

      // 크기가 커질수록 가까움
      if (size > 0) {
        estimate = 1 / (size * 3); // 튜닝된 scaling
      }
    }

    // 2) IR intensity 기반 보정
    if (frame.ir !== undefined && frame.ir > 0) {
      const irFactor = 1 - frame.ir; // IR 가까우면 값 증가
      estimate = (estimate + irFactor) / 2;
    }

    // 3) 모델 Z-depth 기반 보정
    if (frame.zDepth !== undefined) {
      estimate = (estimate + frame.zDepth) / 2;
    }

    // 4) 클램핑 (0.05m ~ 1.5m)
    estimate = this.clamp(estimate);

    // 5) 스파이크 제거
    estimate = this.removeSpike(this.prevDistance, estimate);

    // 6) EMA smoothing
    estimate = this.ema(this.prevDistance, estimate);

    // 업데이트
    this.prevDistance = estimate;

    const risk = this.calculateRisk(estimate);

    return {
      distance: estimate,
      risk,
      timestamp: new Date().toISOString(),
    };
  }
};
