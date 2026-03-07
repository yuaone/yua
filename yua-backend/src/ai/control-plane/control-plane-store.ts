// 🔒 Control Plane Store (SSOT SAFE)

import { MetaParameter } from "./meta-parameter";

export class ControlPlaneStore {
  private meta: MetaParameter[] = [];
  private lastUpdateByKey = new Map<string, number>();

  private static MAX_CUMULATIVE = 0.08;
  private static COOLDOWN_MS = 30 * 60 * 1000;

  add(param: MetaParameter) {
    const now = Date.now();

    // 🔥 TTL 기본값
    param.ttlMs ??= 6 * 60 * 60 * 1000;

    const key = `${param.target}:${param.key}`;

    const lastUpdate = this.lastUpdateByKey.get(key);
    if (lastUpdate && now - lastUpdate < ControlPlaneStore.COOLDOWN_MS) {
      return; // cooldown
    }

    const currentDelta = this.meta
      .filter(m => m.target === param.target && m.key === param.key)
      .reduce((sum, m) => sum + m.delta * m.confidence, 0);

    const projected =
      currentDelta + param.delta * param.confidence;

    if (
      Math.abs(projected) > ControlPlaneStore.MAX_CUMULATIVE
    ) {
      return; // clamp overflow 방지
    }

    this.meta.push(param);
    this.lastUpdateByKey.set(key, now);
  }

  private cleanup() {
    const now = Date.now();
    this.meta = this.meta.filter(
      m =>
        !m.ttlMs ||
        now - m.createdAt <= m.ttlMs
    );
  }

  snapshot(): MetaParameter[] {
    this.cleanup();
    return [...this.meta];
  }
}

export const controlPlaneStore = new ControlPlaneStore();