// 📂 src/ai/hpe/hpe7/memory-store.ts
// ------------------------------------------------------
// Safe CausalEvent Storage (File-based)
// ------------------------------------------------------

import fs from "fs/promises";
import path from "path";
import { CausalEvent } from "./hpe7-protocol";

const STORE_PATH = path.join(process.cwd(), "data", "hpe7-memory.json");

// Ensure directory exists
async function ensureStore() {
  const dir = path.dirname(STORE_PATH);
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, "[]", "utf8");
  }
}

export async function saveEvent(event: CausalEvent): Promise<void> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");

  let data: CausalEvent[] = [];
  try {
    data = JSON.parse(raw);
  } catch {
    // file corrupted → reset
    data = [];
  }

  data.push(event);

  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function loadMemory(): Promise<CausalEvent[]> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}
