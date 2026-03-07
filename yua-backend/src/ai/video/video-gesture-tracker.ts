// 📂 src/ai/video/video-gesture-tracker.ts
// ✋ Gesture Tracker — ENTERPRISE FINAL FIXED (2025.11)
// -------------------------------------------------------------------
// ✔ MediaPipe landmarks 기반 손좌표 추출
// ✔ depth/IR 기반 Z 안정화
// ✔ swipe / push / pinch 전처리용 속도 계산
// ✔ smoothing(EMA)
// ✔ 위험도 계산
// ✔ read() 추가 → VideoEngine 와 100% 호환
// -------------------------------------------------------------------

export interface GestureFrame {
  handLandmarks?: { x: number; y: number; z: number }[];
  bbox?: { x: number; y: number; w: number; h: number };
  depth?: number;
  ir?: number;
}

export interface GestureState {
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  risk: number;
  timestamp: string;
}

export const GestureTracker = {
  prev: { x: 0.5, y: 0.5, z: 0.2, time: Date.now() },
  alpha: 0.25,

  // -------------------------------------------------------------
  // 클램핑 (0~1 normalize)
  // -------------------------------------------------------------
  clamp(v: number) {
    return Math.max(0, Math.min(1, v));
  },

  // smoothing (EMA)
  ema(prev: number, curr: number) {
    return prev * (1 - this.alpha) + curr * this.alpha;
  },

  // 속도 기반 위험도 계산
  calcRisk(dx: number, dy: number, dz: number) {
    const speed = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (speed > 0.5) return 80;
    if (speed > 0.3) return 40;
    if (speed > 0.15) return 20;
    return 0;
  },

  // -------------------------------------------------------------
  // 메인 추적기 (입력 frame → 좌표 + 위험도 변환)
  // -------------------------------------------------------------
  track(frame: GestureFrame): GestureState {
    let x = 0.5;
    let y = 0.5;
    let z = 0.2;

    // 1) Hand landmarks 기반 중심 계산
    if (frame.handLandmarks && frame.handLandmarks.length > 0) {
      const pts = frame.handLandmarks;
      const avg = pts.reduce(
        (acc, p) => ({
          x: acc.x + p.x,
          y: acc.y + p.y,
          z: acc.z + (frame.depth ?? p.z),
        }),
        { x: 0, y: 0, z: 0 }
      );

      x = avg.x / pts.length;
      y = avg.y / pts.length;
      z = avg.z / pts.length;
    }

    // 2) bounding box fallback
    if (frame.bbox) {
      const { x: bx, y: by, w, h } = frame.bbox;
      x = bx + w / 2;
      y = by + h / 2;
    }

    // 3) depth + IR 보정
    if (frame.depth !== undefined) z = (z + frame.depth) / 2;
    if (frame.ir !== undefined) z = (z + (1 - frame.ir)) / 2;

    // 4) normalize
    x = this.clamp(x);
    y = this.clamp(y);
    z = this.clamp(z);

    // 5) smoothing
    const sx = this.ema(this.prev.x, x);
    const sy = this.ema(this.prev.y, y);
    const sz = this.ema(this.prev.z, z);

    // 6) 속도 계산
    const dx = sx - this.prev.x;
    const dy = sy - this.prev.y;
    const dz = sz - this.prev.z;

    const risk = this.calcRisk(dx, dy, dz);

    this.prev = { x: sx, y: sy, z: sz, time: Date.now() };

    return {
      x: sx,
      y: sy,
      z: sz,
      dx,
      dy,
      dz,
      risk,
      timestamp: new Date().toISOString(),
    };
  },

  // -------------------------------------------------------------
  // read() — VideoEngine 호환용 (frame 없이도 동작)
  // -------------------------------------------------------------
  read(): { event: string; action: string; confidence: number } {
    const r = this.prev;
    const speed = Math.sqrt(
      (r.x - 0.5) ** 2 + (r.y - 0.5) ** 2 + (r.z - 0.2) ** 2
    );

    // 단순한 이벤트 매핑 (추후 확장 가능)
    let event = "NORMAL";
    let action = "";
    let confidence = 0;

    if (speed > 0.5) {
      event = "DANGER";
      action = "fast_movement";
      confidence = 0.9;
    } else if (speed > 0.3) {
      event = "WARNING";
      action = "swipe";
      confidence = 0.75;
    } else if (speed > 0.15) {
      event = "WARNING";
      action = "approach";
      confidence = 0.6;
    }

    return { event, action, confidence };
  },
};
