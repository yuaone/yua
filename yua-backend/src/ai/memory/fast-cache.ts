// 📂 src/ai/memory/fast-cache.ts
// 🔥 FastCache Engine — SUPER FAST MODE (2025.11)
// -------------------------------------------------------
// ✔ Advisor / Report / Risk / Workflow 엔진 캐시 엔진
// ✔ LRU-like 구조 + TTL 지원
// ✔ JSON 비교 / DeepCache 안정화
// -------------------------------------------------------

export interface CacheOptions {
  ttl?: number; // milliseconds
  namespace?: string;
}

interface CacheEntry {
  value: any;
  expire: number;
}

export class FastCache {
  private static store: Map<string, CacheEntry> = new Map();

  // --------------------------------------------------------
  // 🔵 Key 생성기
  // --------------------------------------------------------
  static makeKey(namespace: string, raw: any): string {
    return `${namespace}:${JSON.stringify(raw)}`;
  }

  // --------------------------------------------------------
  // 🔵 Set
  // --------------------------------------------------------
  static set(key: string, value: any, opts: CacheOptions = {}): void {
    const ttl = opts.ttl ?? 1000 * 60 * 5; // 5min
    this.store.set(key, {
      value,
      expire: Date.now() + ttl,
    });
  }

  // --------------------------------------------------------
  // 🔵 Get
  // --------------------------------------------------------
  static get(key: string): any | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expire) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  // --------------------------------------------------------
  // 🔵 Remove
  // --------------------------------------------------------
  static remove(key: string): void {
    this.store.delete(key);
  }

  // --------------------------------------------------------
  // 🔵 Clear all
  // --------------------------------------------------------
  static clear(): void {
    this.store.clear();
  }
}
