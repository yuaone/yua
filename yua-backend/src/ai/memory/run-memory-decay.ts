import { MemoryDecayEngine } from "./memory-decay-engine";

(async () => {
  const result = await MemoryDecayEngine.run();
  console.log("[MEMORY_DECAY]", result);
  process.exit(0);
})();
