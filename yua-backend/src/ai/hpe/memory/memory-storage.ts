// 📂 src/ai/hpe/memory/memory-storage.ts

import { MemoryRecord, MemoryQueryOptions, MemorySearchResult } from "./memory-types";

export const MemoryStorage = {
  _store: [] as MemoryRecord[],

  add(record: MemoryRecord) {
    this._store.push(record);
    return record;
  },

  all(): MemoryRecord[] {
    return [...this._store];
  },

  find(opts: MemoryQueryOptions = {}): MemorySearchResult {
    let filtered = [...this._store];

    if (opts.sinceMs) {
      const cutoff = Date.now() - opts.sinceMs;
      filtered = filtered.filter((r) => r.timestamp >= cutoff);
    }

    if (opts.keyword) {
      const key = opts.keyword.toLowerCase();
      filtered = filtered.filter((r) => r.text.toLowerCase().includes(key));
    }

    if (opts.limit && opts.limit > 0) {
      filtered = filtered.slice(-opts.limit);
    }

    return {
      total: filtered.length,
      records: filtered,
    };
  },

  getById(id: string) {
    return this._store.find((r) => r.id === id) ?? null;
  },
};
