// Memory API Types — SSOT (yua-shared)

export interface MemoryRecord {
  id: number;
  scope: string;
  content: string;
  confidence: number;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
  access_count: number;
  locked: boolean;
}

export interface MemorySummaryResponse {
  ok: boolean;
  summary: {
    scopes: { scope: string; count: number; last_updated: string }[];
    recentMemories: MemoryRecord[];
    crossThreadMemories: {
      id: string;
      type: string;
      summary: string;
      created_at: string;
    }[];
  };
}

export interface MemoryListResponse {
  ok: boolean;
  memories: MemoryRecord[];
}
