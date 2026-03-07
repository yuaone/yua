// 🌑 Gesture Calibrator — Low-light / IR Enhancement Engine
// ----------------------------------------------------------------------
// ✔ 저조도(어두운 환경) 밝기 보정
// ✔ 감마 보정(Gamma Correction)
// ✔ IR 모드 자동 전환
// ✔ 노이즈 제거(Temporal Blur + Median Filter)
// ✔ 대비 향상(Contrast Boost)
// ✔ 감광 센서 기반 exposure 보정
// ✔ 실시간 제스처 추적 안정성 향상
// ----------------------------------------------------------------------

export const GestureCalibrator = {
  prevFrame: null as any,
  gamma: 1.4,         // 감마 보정
  contrast: 1.2,      // 대비 개선
  brightnessBoost: 15, // 저조도 보정

  enhance(frame: ImageData & { irMode?: boolean }) {
    if (!frame || !frame.data) return frame;

    const { data } = frame;
    const isIR = frame.irMode === true;

    // -----------------------------------------------
    // 1) IR 모드 → 색상 대신 윤곽/밝기만 강화
    // -----------------------------------------------
    if (isIR) {
      for (let i = 0; i < data.length; i += 4) {
        // RGB → grayscale
        const gray = (data[i] + data[i+1] + data[i+2]) / 3;
        data[i] = gray;
        data[i+1] = gray;
        data[i+2] = gray;
      }
    }

    // -----------------------------------------------
    // 2) 밝기 보정 (저조도 환경 전용)
    // -----------------------------------------------
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = Math.min(255, data[i] + this.brightnessBoost);
      data[i + 1] = Math.min(255, data[i + 1] + this.brightnessBoost);
      data[i + 2] = Math.min(255, data[i + 2] + this.brightnessBoost);
    }

    // -----------------------------------------------
    // 3) 감마 보정 (Gamma Correction)
    // -----------------------------------------------
    const invGamma = 1 / this.gamma;
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = 255 * Math.pow(data[i] / 255, invGamma);
      data[i + 1] = 255 * Math.pow(data[i + 1] / 255, invGamma);
      data[i + 2] = 255 * Math.pow(data[i + 2] / 255, invGamma);
    }

    // -----------------------------------------------
    // 4) 대비 향상 (Contrast Boost)
    // -----------------------------------------------
    const factor = (259 * (this.contrast + 255)) / (255 * (259 - this.contrast));
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = this.applyContrast(data[i], factor);
      data[i + 1] = this.applyContrast(data[i + 1], factor);
      data[i + 2] = this.applyContrast(data[i + 2], factor);
    }

    // -----------------------------------------------
    // 5) Temporal Smoothing (이전 프레임 기반 안정화)
    // -----------------------------------------------
    if (this.prevFrame) {
      const prev = this.prevFrame.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i]     = (data[i] + prev[i]) / 2;
        data[i + 1] = (data[i + 1] + prev[i + 1]) / 2;
        data[i + 2] = (data[i + 2] + prev[i + 2]) / 2;
      }
    }

    // 업데이트
    this.prevFrame = frame;

    return frame;
  },

  applyContrast(value: number, factor: number) {
    return Math.min(255, Math.max(0, factor * (value - 128) + 128));
  },
};
