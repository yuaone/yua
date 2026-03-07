// 📏 Sensor Normalizer — Enterprise Noise Reduction
// --------------------------------------------------------------
// ✔ EMA (지수 가중 이동 평균)
// ✔ 스파이크(이상치) 제거
// ✔ 센서 값 범위 클램핑(0~1)
// ✔ Depth / Motion / IR 개별 smoothing
// ✔ 센서 고장값 필터링
// ✔ 위험도(risk score) 계산
// --------------------------------------------------------------

export const SensorNormalizer = {
  // 최근 EMA 값 저장
  history: {
    ir: 0,
    depth: 0,
    motion: 0,
  },

  // EMA 계수 (0.1~0.3 recommended)
  alpha: 0.25,

  // 범위 제한 함수
  clamp(v: number) {
    if (isNaN(v) || !isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
  },

  // 스파이크 제거
  removeSpike(prev: number, curr: number) {
    const diff = Math.abs(curr - prev);

    // 변화량이 지나치게 크면 스파이크로 판단
    if (diff > 0.6) {
      return prev + Math.sign(curr - prev) * 0.2; // 완만하게 이동
    }
    return curr;
  },

  // EMA smoothing
  ema(prev: number, curr: number) {
    return prev * (1 - this.alpha) + curr * this.alpha;
  },

  // 위험도 계산(센서 흔들림/급변 등)
  calculateRisk(prev: number, curr: number) {
    const diff = Math.abs(curr - prev);

    if (diff > 0.5) return 80;        // 매우 급격한 변화 → 높은 위험
    if (diff > 0.3) return 40;
    if (diff > 0.15) return 10;
    return 0;
  },

  normalize(sensorData: { ir: number; depth: number; motion: number }) {
    const { ir, depth, motion } = sensorData;

    // 1) 고장값 제거
    const safeIR = this.clamp(ir);
    const safeDepth = this.clamp(depth);
    const safeMotion = this.clamp(motion);

    // 2) 스파이크 제거
    const irNoSpike = this.removeSpike(this.history.ir, safeIR);
    const depthNoSpike = this.removeSpike(this.history.depth, safeDepth);
    const motionNoSpike = this.removeSpike(this.history.motion, safeMotion);

    // 3) EMA smoothing
    const irEma = this.ema(this.history.ir, irNoSpike);
    const depthEma = this.ema(this.history.depth, depthNoSpike);
    const motionEma = this.ema(this.history.motion, motionNoSpike);

    // 4) history 업데이트
    this.history.ir = irEma;
    this.history.depth = depthEma;
    this.history.motion = motionEma;

    // 5) risk score 계산
    const riskDepth = this.calculateRisk(this.history.depth, depthEma);
    const riskMotion = this.calculateRisk(this.history.motion, motionEma);
    const riskIR = this.calculateRisk(this.history.ir, irEma);

    const risk = Math.max(riskDepth, riskMotion, riskIR);

    // 6) 결과 반환
    return {
      ir: irEma,
      depth: depthEma,
      motion: motionEma,
      risk,
      timestamp: new Date().toISOString(),
    };
  }
};
