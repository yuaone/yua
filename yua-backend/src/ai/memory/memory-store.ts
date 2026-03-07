// 📂 src/ai/memory/memory-store.ts
// 🔥 YUA-AI Memory Store — ERROR-SAFE FINAL (2025.12)

import { pool } from "../../db/mysql";

/* ---------------------------------------------------
   Base Types
--------------------------------------------------- */
export interface MemoryRecord {
  role: string;
  content: string;
  key?: string;
  timestamp?: number;
  state?: any;
}

export interface LongMemoryRecord {
  key: string;
  value: string;
  updatedAt: number;
}

export interface ProjectMemoryRecord {
  projectId: string;
  key: string;
  value: string;
  updatedAt: number;
}

/* ---------------------------------------------------
   Quantum/HPE Wave
--------------------------------------------------- */
export interface SimpleWave {
  real: number[];
  imag: number[];
}

/* ---------------------------------------------------
   Internal Stores (In-Memory)
--------------------------------------------------- */
const shortMemoryStore: MemoryRecord[] = [];
const longMemoryStore: LongMemoryRecord[] = [];
const projectMemoryStore: ProjectMemoryRecord[] = [];
const quantumMemoryStore: MemoryRecord[] = [];
const hpeMemoryStore: MemoryRecord[] = [];

/* ---------------------------------------------------
   Short Memory
--------------------------------------------------- */
export const ShortMemory = {
  MAX: 30,

  getAll(): MemoryRecord[] {
    return [...shortMemoryStore];
  },

  peekLast(): MemoryRecord | null {
    return shortMemoryStore.at(-1) ?? null;
  },

  /**
   * ⭐ FIX: memory-short.ts 와의 인터페이스 정합성
   * 기존 코드에서 사용 중인 setAll 복구
   */
  setAll(records: MemoryRecord[]): void {
    shortMemoryStore.length = 0;
    shortMemoryStore.push(...records.slice(-this.MAX));
  },

  async add(record: MemoryRecord): Promise<void> {
    shortMemoryStore.push(record);
    if (shortMemoryStore.length > this.MAX) shortMemoryStore.shift();

    try {
      await pool.query(
        `
        INSERT INTO memory_store
        (type, role, content, updated_at)
        VALUES ('short', ?, ?, NOW())
        `,
        [record.role, record.content]
      );
    } catch (err) {
      console.warn("⚠ ShortMemory DB skipped:", (err as Error).message);
    }
  },

  clear(): void {
    shortMemoryStore.length = 0;
  },
};

/* ---------------------------------------------------
   Long Memory
--------------------------------------------------- */
export const LongMemory = {
  getAll(): LongMemoryRecord[] {
    return [...longMemoryStore];
  },

  get(key: string): LongMemoryRecord | null {
    return longMemoryStore.find((m) => m.key === key) ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    const existing = longMemoryStore.find((m) => m.key === key);

    if (existing) {
      existing.value = value;
      existing.updatedAt = Date.now();
    } else {
      longMemoryStore.push({ key, value, updatedAt: Date.now() });
    }

    try {
      await pool.query(
        `
        INSERT INTO memory_store (type, key_name, value, updated_at)
        VALUES ('long', ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          value = VALUES(value),
          updated_at = NOW()
        `,
        [key, value]
      );
    } catch (err) {
      console.warn("⚠ LongMemory DB skipped:", (err as Error).message);
    }
  },

  async remove(key: string): Promise<void> {
    const idx = longMemoryStore.findIndex((m) => m.key === key);
    if (idx !== -1) longMemoryStore.splice(idx, 1);

    try {
      await pool.query(
        `DELETE FROM memory_store WHERE type='long' AND key_name = ?`,
        [key]
      );
    } catch (err) {
      console.warn("⚠ LongMemory delete skipped:", (err as Error).message);
    }
  },
};

/* ---------------------------------------------------
   Project Memory
--------------------------------------------------- */
export const ProjectMemory = {
  getAll(projectId: string): ProjectMemoryRecord[] {
    return projectMemoryStore.filter((m) => m.projectId === projectId);
  },

  async set(projectId: string, key: string, value: string): Promise<void> {
    const existing = projectMemoryStore.find(
      (m) => m.projectId === projectId && m.key === key
    );

    if (existing) {
      existing.value = value;
      existing.updatedAt = Date.now();
    } else {
      projectMemoryStore.push({ projectId, key, value, updatedAt: Date.now() });
    }

    try {
      await pool.query(
        `
        INSERT INTO memory_store (type, project_id, key_name, value, updated_at)
        VALUES ('project', ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          value = VALUES(value),
          updated_at = NOW()
        `,
        [projectId, key, value]
      );
    } catch (err) {
      console.warn("⚠ ProjectMemory DB skipped:", (err as Error).message);
    }
  },
};

/* ---------------------------------------------------
   Quantum Memory (In-Memory Only)
--------------------------------------------------- */
export const QuantumMemory = {
  getAll(): MemoryRecord[] {
    return [...quantumMemoryStore];
  },

  getMemoryWave(): SimpleWave {
    const last = quantumMemoryStore.at(-1);
    if (!last) return { real: [], imag: [] };

    try {
      const parsed = JSON.parse(last.content);
      return parsed?.state ?? { real: [], imag: [] };
    } catch {
      return { real: [], imag: [] };
    }
  },

  async add(record: MemoryRecord): Promise<void> {
    quantumMemoryStore.push(record);
  },
};

/* ---------------------------------------------------
   HPE Memory (In-Memory Only)
--------------------------------------------------- */
export const HPEMemory = {
  getAll(): MemoryRecord[] {
    return [...hpeMemoryStore];
  },

  async add(record: MemoryRecord): Promise<void> {
    hpeMemoryStore.push(record);
  },
};

/* ---------------------------------------------------
   Export Final
--------------------------------------------------- */
export const MemoryStore = {
  short: ShortMemory,
  long: LongMemory,
  project: ProjectMemory,
  quantum: QuantumMemory,
  hpe: HPEMemory,
};
