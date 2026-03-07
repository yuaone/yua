// 📂 src/ai/hpe/memory/memory-types.ts

export interface MemoryRecord {
  id: string;
  type: "interaction" | "prediction" | "system" | "custom";
  text: string;
  timestamp: number;
  strength: number; // 0 ~ 1
}

export interface MemoryQueryOptions {
  limit?: number;
  sinceMs?: number;
  keyword?: string;
}

export interface MemorySearchResult {
  total: number;
  records: MemoryRecord[];
}

export interface MemoryIndex {
  keyword: string;
  ids: string[];
}

export interface CausalLink {
  from: string;
  to: string;
  weight: number;
}
