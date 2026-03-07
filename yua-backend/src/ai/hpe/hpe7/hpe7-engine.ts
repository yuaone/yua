// 📂 src/ai/hpe/hpe7/hpe7-engine.ts
// ------------------------------------------------------
// HPE 7.0 — MAIN ENGINE (FINAL CLEAN VERSION)
// ------------------------------------------------------

import {
  HPE7Input,
  HPE7Output,
  HPE7HyperParams,
  CausalEvent,
  CausalGraph
} from "./hpe7-protocol";

import { StateManager } from "./state";
import { Policy } from "./policy";
import { saveEvent, loadMemory } from "./memory-store";
import { MemoryLoader } from "./mem-loader";
import { MemoryReasoner } from "./mem-reasoner";
import { buildCausalGraph } from "./causal-graph";

export async function runHPE7(input: HPE7Input): Promise<HPE7Output> {
  const safeText = String(input.text ?? "");

  // ------------------------------------------------------
  // 1) 메모리 기록 (output placeholder 제공)
  // ------------------------------------------------------
  MemoryLoader.recordInteraction(safeText, "");

  // ------------------------------------------------------
  // 2) State 생성
  // ------------------------------------------------------
  const state = StateManager.buildInitialState();

  const params: HPE7HyperParams = {
    eta: 0.1,
    betaDrift: 0.3,
    betaInterf: 0.2,
    targetScoreQuantile: 0.95,
    lambdaMax: 1.0,
    lambdaDecayK: 3.0,
    lambdaTau: 0.5
  };

  const result = Policy.run(state, params, []);

  // ------------------------------------------------------
  // 3) Causal Event
  // ------------------------------------------------------
  const event: CausalEvent = {
    id: Date.now().toString(),
    input: safeText,
    output: safeText,   // bestScenario.text 없음 → safeText 사용
    timestamp: Date.now(),
    tags: []
  };

  await saveEvent(event);

  // ------------------------------------------------------
  // 4) Graph 생성 (형 맞추기)
  // ------------------------------------------------------
  const memory = await loadMemory();
  const rawLinks = buildCausalGraph(memory);

  const graph: CausalGraph = {
    nodes: memory,
    links: rawLinks
  };

  // ------------------------------------------------------
  // 5) MemoryReasoner
  // ------------------------------------------------------
  const recent = MemoryReasoner.summarizeRecent(24);
  const patterns = MemoryReasoner.detectPatterns();

  // ------------------------------------------------------
  // 6) 출력
  // ------------------------------------------------------
  return {
    ok: true,
    saved: true,
    event,
    graph,
    memory: {
      recent,
      patterns
    }
  };
}
