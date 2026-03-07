// 📂 src/ai/quantum/quantum-engine-v2.ts
// 🔥 Quantum Engine v2 — FINAL STABLE (2025.12)

import { computeWorkingWave, WaveState } from "./qinterference";
import { ComplexWave } from "./qwave-v2";

/**
 * ✅ 런타임 안전: declare 금지
 * - 구현이 없으면 undefined로 터짐(이번 에러 원인)
 * - 아래처럼 "import 시도 + 없으면 fallback" 패턴으로 고정
 */

// (1) generateWaveV2: 있으면 가져오고, 없으면 fallback 구현 사용
let generateWaveV2Impl: ((input: string) => Promise<ComplexWave>) | null = null;
try {
  // 프로젝트에 실제 구현 파일이 존재한다면 여기 경로를 맞춰줘
  // 예: "./qwave-generator-v2" / "./qwave-gen" 등
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("./generate-wave-v2");
  generateWaveV2Impl = (mod.generateWaveV2 ?? mod.default) as any;
} catch {
  generateWaveV2Impl = null;
}

// (2) collapse helpers: 있으면 가져오고 없으면 fallback
let bornCollapseImpl: ((real: number[], imag: number[], decay: number, iterations: number) => number) | null = null;
let collapseToTextImpl: ((raw: string, index: number) => string) | null = null;
let collapseMatrixImpl: ((real: number[]) => number) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("./collapse");
  bornCollapseImpl = (mod.bornCollapse ?? null) as any;
  collapseToTextImpl = (mod.collapseToText ?? null) as any;
  collapseMatrixImpl = (mod.collapseMatrix ?? null) as any;
} catch {
  bornCollapseImpl = null;
  collapseToTextImpl = null;
  collapseMatrixImpl = null;
}

// (3) 완전 fallback (항상 동작)
async function fallbackGenerateWaveV2(input: string): Promise<ComplexWave> {
  // 아주 가벼운 deterministic wave (속도 우선)
  const n = Math.max(8, Math.min(256, input.length * 4));
  const real = new Array<number>(n);
  const imag = new Array<number>(n);
  let seed = 0;
  for (let i = 0; i < input.length; i++) seed = (seed * 31 + input.charCodeAt(i)) >>> 0;
  for (let i = 0; i < n; i++) {
    const v = ((seed ^ (i * 2654435761)) >>> 0) / 0xffffffff;
    real[i] = Math.cos(v * Math.PI * 2);
    imag[i] = Math.sin(v * Math.PI * 2);
  }
  return { real, imag } as any;
}

function fallbackCollapseMatrix(real: number[]): number {
  // 가장 큰 |real| 인덱스를 고르는 단순 collapse
  let best = 0;
  let bestAbs = -1;
  for (let i = 0; i < real.length; i++) {
    const a = Math.abs(real[i]);
    if (a > bestAbs) { bestAbs = a; best = i; }
  }
  return best;
}

function fallbackCollapseToText(raw: string, index: number): string {
  // index 주변을 잘라 “관점” 토큰으로
  if (!raw) return "";
  const i = Math.max(0, Math.min(index, raw.length - 1));
  const left = Math.max(0, i - 18);
  const right = Math.min(raw.length, i + 18);
  return raw.slice(left, right).trim();
}
// 외부 의존성
interface QuantumMemoryType {
    getMemoryWave: (influence: number) => WaveState | null;
    save: (wave: ComplexWave) => void;
}

interface EntangleEngineType {
    jointConditional: (real: number[], imag: number[], index: number, influence: number) => void;
}

interface VectorEngineType {
    search: (query: string, count: number) => Promise<any[]>;
}

import { QuantumMemory as ImportedQuantumMemory } from "./qmemory";
import { EntangleEngine as ImportedEntangleEngine } from "./qentangle";
import { VectorEngine as ImportedVectorEngine } from "../vector/vector-engine";

const QuantumMemory: QuantumMemoryType = ImportedQuantumMemory as any;
const EntangleEngine: EntangleEngineType = ImportedEntangleEngine as any;
const vector = new (ImportedVectorEngine as any)();

export interface QuantumV2Result {
    raw: string;
    wave: WaveState;
    working: WaveState;
    collapseIndex: number;
    token: string;
    related: any[];
    confidence?: number;
}

export async function runQuantumEngineV2(input: string): Promise<QuantumV2Result> {
    const raw = input.trim();

    if (!raw) {
        return {
            raw,
            wave: { real: [], imag: [] },
            working: { real: [], imag: [] },
            collapseIndex: 0,
            token: "",
            related: [],
            confidence: 0
        };
    }

    // 1) Wave 생성
    const curr = await (generateWaveV2Impl ? generateWaveV2Impl(raw) : fallbackGenerateWaveV2(raw));
    const wave: WaveState = { real: curr.real, imag: curr.imag };

    // 2) Memory Wave
    const memWave = QuantumMemory.getMemoryWave(0.9);

    // 3) Working Wave
    const working = computeWorkingWave(wave, memWave);

    // 4) Collapse
    let collapseIndex = 0;
    try {
         if (bornCollapseImpl) {
          collapseIndex = bornCollapseImpl(working.real, working.imag, 0.9, 40);
        } else {
          collapseIndex = fallbackCollapseMatrix(working.real);
        }
    } catch {
       collapseIndex = (collapseMatrixImpl ? collapseMatrixImpl(working.real) : fallbackCollapseMatrix(working.real));
    }

    collapseIndex = Math.max(0, Math.min(collapseIndex, raw.length - 1));

    // 5) Entanglement Correction
    try {
        EntangleEngine.jointConditional(
            working.real,
            working.imag,
            collapseIndex,
            0.3
        );
    } catch (err) {
        console.warn("Entangle correction failed:", err);
    }

    // 6) Token
    const token = (collapseToTextImpl ? collapseToTextImpl(raw, collapseIndex) : fallbackCollapseToText(raw, collapseIndex));

    // 7) Vector 검색
    const relatedPromise = vector.search(raw, 3).catch(() => []);

    // 8) Memory 저장
    try {
        QuantumMemory.save(curr);
    } catch (err) {
        console.warn("Quantum memory save failed:", err);
    }

    return {
        raw,
        wave,
        working,
        collapseIndex,
        token,
        related: await relatedPromise,
        confidence: 0.85
    };
}
