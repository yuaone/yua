// 📂 src/ai/hpe/memory/memory-indexer.ts

import { MemoryStorage } from "./memory-storage";
import { MemoryIndex, MemoryRecord } from "./memory-types";

export const MemoryIndexer = {
  _index: new Map<string, Set<string>>(), // keyword → recordId[]

  buildIndex() {
    this._index.clear();

    const all = MemoryStorage.all();

    for (const record of all) {
      const tokens = record.text.toLowerCase().split(/\W+/).filter(Boolean);

      for (const t of tokens) {
        if (!this._index.has(t)) this._index.set(t, new Set());
        this._index.get(t)!.add(record.id);
      }
    }
  },

  search(keyword: string): MemoryIndex {
    keyword = keyword.toLowerCase();
    const ids = this._index.get(keyword);

    return {
      keyword,
      ids: ids ? Array.from(ids) : [],
    };
  },

  rebuildSoon() {
    setTimeout(() => this.buildIndex(), 50);
  },

  recordAdded(record: MemoryRecord) {
    const tokens = record.text.toLowerCase().split(/\W+/).filter(Boolean);

    for (const t of tokens) {
      if (!this._index.has(t)) this._index.set(t, new Set());
      this._index.get(t)!.add(record.id);
    }
  }
};
