// 🔒 PHASE 9-3 Path Risk Registry (SSOT)
// - snapshot 전용
// - runtime 영향 ❌
// - mutation ❌

export type PathRiskSnapshot = {
  path: string;
  riskScore: number; // 0 ~ 1
  updatedAt: number;
};

const registry = new Map<string, PathRiskSnapshot>();

export class PathRiskRegistry {
  static update(path: string, riskScore: number) {
    registry.set(path, {
      path,
      riskScore: Math.max(0, Math.min(1, riskScore)),
      updatedAt: Date.now(),
    });
  }

  static get(path: string): PathRiskSnapshot | null {
    return registry.get(path) ?? null;
  }

  static getAll(): PathRiskSnapshot[] {
    return Array.from(registry.values());
  }

  static reset() {
    registry.clear();
  }
}
