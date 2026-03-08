import { MemoryDecayEngine } from "./memory-decay-engine";

(async () => {
  try {
    const result = await MemoryDecayEngine.run();
    console.log("[MEMORY_DECAY] done", JSON.stringify(result));
    process.exit(0);
  } catch (err) {
    console.error("[MEMORY_DECAY] failed", err);
    process.exit(1);
  }
})();
