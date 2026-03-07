// 📂 src/ai/memory/memory-long.ts
// 🔥 YUA-AI LongMemoryEngine — ENTERPRISE VECTOR MODE FINAL (2025.11)
// -------------------------------------------------------------------
// ✔ 기존 Text Memory 유지
// ✔ + VectorMemory 자동 저장 (pgvector)
// ✔ SmartSave + NoiseFilter + Merge
// ✔ MemoryEngine / UniversalEngine 완전 호환
// -------------------------------------------------------------------

import { LongMemoryRecord, MemoryStore } from "./memory-store";
import { VectorEngine } from "../vector/vector-engine";

const vector = new VectorEngine();

export const LongMemoryEngine = {
  // ------------------------------------------------------
  // 🔵 기본 save (텍스트 메모리 저장 + 벡터 저장)
  // ------------------------------------------------------
  save(key: string, value: string): void {
    if (!key || !value) return;

    const clean = value.trim();
    if (clean.length < 5) return;

    const existing = MemoryStore.long.get(key);
    if (existing && existing.value === clean) return;

    // 1) 텍스트 메모리 저장
    MemoryStore.long.set(key, clean);

    // 2) 벡터 메모리 저장 (NEW)
    vector.store(`long_${key}`, clean, { type: "long_memory" });
  },

  // ------------------------------------------------------
  // 🔵 Get
  // ------------------------------------------------------
  get(key: string): string | null {
    const record: LongMemoryRecord | null = MemoryStore.long.get(key);
    return record ? record.value : null;
  },

  // ------------------------------------------------------
  // 🔵 Get All
  // ------------------------------------------------------
  getAll(): Record<string, string> {
    const list = MemoryStore.long.getAll();
    const out: Record<string, string> = {};

    for (const item of list) {
      if (item?.key && item.value) out[item.key] = item.value;
    }
    return out;
  },

  // ------------------------------------------------------
  // 🔵 Remove
  // ------------------------------------------------------
  remove(key: string): void {
    MemoryStore.long.remove(key);
  },

  // ------------------------------------------------------
  // ⭐ SmartSave (정제 + Merge + NoiseFilter + Vector 저장)
  // ------------------------------------------------------
  smartSave(key: string, value: string): void {
    if (!key || !value) return;

    const clean = value.trim();
    if (clean.length < 5) return;

    // Noise filter
    const noiseWords = ["몰라", "뭐라는", "??", "ㅋㅋ", "ㄴㄴ", "대충", "헛소리"];
    if (noiseWords.some((n) => clean.includes(n))) return;

    const existing = this.get(key);

    // 동일하면 저장 안 함
    if (existing === clean) return;

    // Smart Merge
    if (existing && existing.length > 10) {
      const merged = `${existing}\n${clean}`;
      this.save(key, merged);
      return;
    }

    this.save(key, clean);
  },

  // ------------------------------------------------------
  // Default Keys
  // ------------------------------------------------------
  defaultKeys: [
    "user_style",
    "user_preference",
    "moneyally_architecture",
    "yuaai_engine_structure",
    "finance_knowledge",
    "tax_rules",
    "development_pattern",
    "security_policy",
    "project_pref",
    "ai_advice_rules",
  ],
};
