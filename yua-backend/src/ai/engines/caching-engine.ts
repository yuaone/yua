// 📂 src/ai/engines/caching-engine.ts
// 🔥 YUA-AI CachingEngine — FINAL PERFECT VERSION (2025.12)
// ✔ 기존 로직 100% 유지
// ✔ stream / normal 캐시 자동 분리
// ✔ SuperAdminEngine 호환

interface CacheEntry<T = any> {
  key: string;
  namespace: string;
  value: T;
  createdAt: number;
  lastHitAt: number;
  hits: number;
  expiresAt: number | null;
}

export interface CacheOptions {
  namespace?: string;
  ttlMs?: number;
}

export interface CacheKeyOptions {
  stream?: boolean;
}

const DEFAULT_NAMESPACE = "default";
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const MAX_ITEMS = 1000;
const MAX_SIZE = 500_000;

export const CachingEngine = {
  _store: new Map<string, CacheEntry>(),

  /* --------------------------------------------------- */
  /* Key 조합                                            */
  /* --------------------------------------------------- */
  _composeKey(namespace: string, key: string) {
    return `${namespace}::${key}`;
  },

  /* --------------------------------------------------- */
  /* 만료 체크                                          */
  /* --------------------------------------------------- */
  _isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  },

  /* --------------------------------------------------- */
  /* LRU 정리                                           */
  /* --------------------------------------------------- */
  _evictIfNeeded() {
    if (this._store.size <= MAX_ITEMS) return;

    const entries = Array.from(this._store.values());

    entries.sort((a, b) => {
      if (a.hits !== b.hits) return a.hits - b.hits;
      return a.lastHitAt - b.lastHitAt;
    });

    const removeCount = this._store.size - MAX_ITEMS;
    for (let i = 0; i < removeCount; i++) {
      const target = entries[i];
      const fullKey = this._composeKey(target.namespace, target.key);
      this._store.delete(fullKey);
    }
  },

  /* --------------------------------------------------- */
  /* Oversize 트림                                      */
  /* --------------------------------------------------- */
  _trimValue(value: any) {
    try {
      const str = typeof value === "string" ? value : JSON.stringify(value);
      if (str.length > MAX_SIZE) {
        return str.slice(0, MAX_SIZE) + "...[TRIMMED]";
      }
      return value;
    } catch {
      return value;
    }
  },

  /* --------------------------------------------------- */
  /* 안전 복제                                          */
  /* --------------------------------------------------- */
  _clone<T>(value: T): T {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  },

  /* --------------------------------------------------- */
  /* SET                                                */
  /* --------------------------------------------------- */
  set<T = any>(key: string, value: T, options: CacheOptions = {}) {
    const namespace = options.namespace || DEFAULT_NAMESPACE;
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

    const now = Date.now();
    const fullKey = this._composeKey(namespace, key);

    const safeValue = this._trimValue(this._clone(value));

    const entry: CacheEntry<T> = {
      key,
      namespace,
      value: safeValue,
      createdAt: now,
      lastHitAt: now,
      hits: 0,
      expiresAt: ttlMs > 0 ? now + ttlMs : null,
    };

    this._store.set(fullKey, entry);
    this._evictIfNeeded();
  },

  /* --------------------------------------------------- */
  /* GET                                                */
  /* --------------------------------------------------- */
  get<T = any>(key: string, options: CacheOptions = {}): T | null {
    const namespace = options.namespace || DEFAULT_NAMESPACE;
    const fullKey = this._composeKey(namespace, key);

    const entry = this._store.get(fullKey);
    if (!entry) return null;

    if (this._isExpired(entry)) {
      this._store.delete(fullKey);
      return null;
    }

    entry.hits += 1;
    entry.lastHitAt = Date.now();
    this._store.set(fullKey, entry);

    return this._clone(entry.value) as T;
  },

  /* --------------------------------------------------- */
  /* has                                                */
  /* --------------------------------------------------- */
  has(key: string, options: CacheOptions = {}): boolean {
    return this.get(key, options) !== null;
  },

  /* --------------------------------------------------- */
  /* delete                                             */
  /* --------------------------------------------------- */
  delete(key: string, options: CacheOptions = {}): boolean {
    const namespace = options.namespace || DEFAULT_NAMESPACE;
    const fullKey = this._composeKey(namespace, key);
    return this._store.delete(fullKey);
  },

  /* --------------------------------------------------- */
  /* namespace 전체 삭제                                */
  /* --------------------------------------------------- */
  clearNamespace(namespace: string) {
    for (const [fullKey, entry] of this._store.entries()) {
      if (entry.namespace === namespace) {
        this._store.delete(fullKey);
      }
    }
  },

  /* --------------------------------------------------- */
  /* 전체 삭제                                          */
  /* --------------------------------------------------- */
  clearAll() {
    this._store.clear();
  },

  /* --------------------------------------------------- */
  /* Payload 기반 Key 생성 (🔥 stream 분리 핵심)        */
  /* --------------------------------------------------- */
  buildKeyFromPayload(
    payload: unknown,
    options?: CacheKeyOptions
  ): string {
    try {
      const base =
        typeof payload === "object" && payload !== null
          ? payload
          : { value: payload };

      const normalized = {
        ...base,
        __mode: options?.stream === true ? "stream" : "normal",
      };

      return JSON.stringify(
        normalized,
        Object.keys(normalized).sort()
      );
    } catch {
      return String(payload) + (options?.stream ? "::stream" : "::normal");
    }
  },

  /* --------------------------------------------------- */
  /* Namespace 전체 조회 (SuperAdmin 전용)               */
  /* --------------------------------------------------- */
  getAllByNamespace(namespace: string) {
    const items: CacheEntry[] = [];

    for (const entry of this._store.values()) {
      if (entry.namespace === namespace) {
        items.push(this._clone(entry));
      }
    }

    return items;
  },
};
