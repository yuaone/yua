// src/batch/run-signal-generators.ts
import { generatePathBiasSignals } from "../ai/signal-generators/runtime-signal-to-path-bias";
import { generateConfidenceTrendSignals } from "../ai/signal-generators/runtime-signal-to-confidence-trend";

async function main() {
  console.log("[BATCH] Signal generation started");

  await generatePathBiasSignals();
  await generateConfidenceTrendSignals();

  console.log("[BATCH] Signal generation finished");
  process.exit(0);
}

main().catch(err => {
  console.error("[BATCH][FATAL]", err);
  process.exit(1);
});
