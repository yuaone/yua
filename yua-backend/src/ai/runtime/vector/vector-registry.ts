// 🔒 Vector Registry (SSOT)
// - snapshot history 저장
// - runtime 영향 ❌

export type VectorSnapshot = {
  path: string;
  values: number[];
  timestamp: number;
};

const registry = new Map<string, VectorSnapshot[]>();
const MAX_HISTORY = 50;

export class VectorRegistry {
  static append(path: string, values: number[]) {
    const list = registry.get(path) ?? [];
    list.push({
      path,
      values,
      timestamp: Date.now(),
    });

    if (list.length > MAX_HISTORY) {
      list.shift();
    }

    registry.set(path, list);
  }

  static getHistory(path: string): VectorSnapshot[] {
    return registry.get(path) ?? [];
  }

  static clear(path?: string) {
    if (path) registry.delete(path);
    else registry.clear();
  }
}
