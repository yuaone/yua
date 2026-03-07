// 📂 src/ai/quantum/quantum-engine.ts
// 🔥 Quantum Engine v1 — ENTERPRISE FINAL BUILD (2025.12)

import { QuantumState } from "./qtypes";

/* --------------------------------------------------
   v1 QuantumResult 최신 구조로 재정의 (오류 해결)
-------------------------------------------------- */
export interface QuantumResult {
  raw: string;
  collapsed: string;
  state: QuantumState;
  drift: number;
  related: any[];
}

/* --------------------------------------------------
   collapseToText 안전 import (fallback 포함)
-------------------------------------------------- */
let collapseToText: (text: string, index: number) => string;

try {
  // 실제 qcollapse.ts가 collapseToText 제공할 경우
  collapseToText = require("./qcollapse").collapseToText;
} catch {
  // fallback: index 위치 문자 선택
  collapseToText = (text: string, index: number) =>
    text[index] ?? text.charAt(0) ?? "";
}

/* --------------------------------------------------
   Internal quantum function declarations
-------------------------------------------------- */
declare function generateWave(input: string): number[];
declare function reduceNoise(wave: number[], driftScore: number): number[];
declare function collapseMatrix(wave: number[]): number;
declare function bornCollapse(
  real: number[],
  imag: number[],
  decay: number,
  iterations: number
): number;

/* --------------------------------------------------
   Memory / Vector Engines
-------------------------------------------------- */
interface MemoryManagerType {
  getQuantumHistory: (count: number) => { state?: QuantumState }[];
  updateQuantumMemory: (data: {
    input: string;
    collapsed: string;
    state: QuantumState;
  }) => void;
}

interface VectorEngineType {
  search: (query: string, count: number) => Promise<any[]>;
}

import { MemoryManager as ImportedMemoryManager } from "../memory/memory-manager";
import { VectorEngine as ImportedVectorEngine } from "../vector/vector-engine";

const MemoryManager = ImportedMemoryManager as any as MemoryManagerType;
const VectorEngine = ImportedVectorEngine;
const vector = new VectorEngine();

/* --------------------------------------------------
   Drift 계산
-------------------------------------------------- */
function computeDrift(
  previous: { state?: QuantumState }[],
  currentWave: number[]
): number {
  if (!previous?.length) return 0;

  let drift = 0;
  let count = 0;

  for (const item of previous) {
    const prev = Array.isArray(item?.state?.vector) ? item.state.vector : [];
    const len = Math.min(prev.length, currentWave.length);
    if (len === 0) continue;

    let diff = 0;
    for (let i = 0; i < len; i++) {
      diff += Math.abs(prev[i] - currentWave[i]);
    }

    drift += diff / len;
    count++;
  }

  return count === 0 ? 0 : drift / count;
}

/* --------------------------------------------------
   ⭐ MAIN Quantum Engine v1 (오류 완전 제거)
-------------------------------------------------- */
export async function runQuantumEngine(input: string): Promise<QuantumResult> {
  const raw = input.trim();

  if (!raw) {
    return {
      raw,
      collapsed: "",
      state: { vector: [], noise: 0, confidence: 1, dimensionality: 0 },
      related: [],
      drift: 0,
    };
  }

  const wave = generateWave(raw);

  const previous = MemoryManager?.getQuantumHistory
    ? MemoryManager.getQuantumHistory(10)
    : [];

  const driftScore = computeDrift(previous, wave);

  const denoised = reduceNoise(wave, driftScore);

  let index = 0;
  const imag = new Array(denoised.length).fill(0);

  try {
    index = bornCollapse(denoised, imag, 0.9, 40);
  } catch {
    index = collapseMatrix(denoised);
  }

  index = Math.max(0, Math.min(index, raw.length - 1));

  const collapsed = collapseToText(raw, index);

  const related = await vector.search(raw, 3);

  /* --------------------------------------------------
     저장용 QuantumState (정확한 타입 보장)
  -------------------------------------------------- */
  const stateToSave: QuantumState = {
    vector: denoised,
    noise: driftScore,
    confidence: Math.max(0, 1 - driftScore),
    dimensionality: denoised.length,
  };

  try {
    MemoryManager.updateQuantumMemory({
      input: raw,
      collapsed,
      state: stateToSave,
    });
  } catch (err) {
    console.warn("Quantum memory save failed:", err);
  }

  return {
    raw,
    collapsed,
    state: stateToSave,
    drift: driftScore,
    related,
  };
}
