// 📂 src/ai/yua/yua-spine.ts
// -------------------------------------------------------------
// ⚡ YUA-AI Spine v4 + MemoryEngine Integrated (FINAL SAFE BUILD)
// -------------------------------------------------------------

import { logger } from "../../utils/logger";

import { yuaDve } from "./yua-dve";
import { yuaSecurity } from "./yua-security";
import { yuaEsieEngine } from "./yua-esie";
import { yuaHpeEngine } from "./yua-hpe";
import { YuaGen59Lite } from "./yua-gen59-lite";
import { yuaSfeLayer } from "./yua-sfe-layer";
import { yuaMgl } from "./yua-mgl";
import { yuaCps } from "./yua-cps";
import { yuaCsk } from "./yua-csk";
import { yuaSuv } from "./yua-suv";

import { YuaMemoryEngine } from "./yua-memory-engine";

import { runQuantumEngine } from "../quantum/quantum-engine";
import { runQuantumEngineV2 } from "../quantum/quantum-engine-v2";
import SpineMathLayer from "./yua-math-layer";
import { VisionEngine } from "../capability/vision-engine";
import { DocumentEngine } from "../capability/document-engine";
import { GenerationEngine } from "../capability/generation-engine";
import type { PathType } from "../../routes/path-router";
import { feedbackFromCapability } from "../judgment/judgment-hook";
import { yuaStateAggregator } from "./yua-state-aggregator";

export interface SpineInput {
  text: string;
  prevState?: any;
  userId?: string;
  instanceId?: string;
  path: PathType;
}

export interface SpineFinalOutput {
  finalText: string;
  stateVector: number[];
  stability: number;
  memoryAdded: any;
  aggregatedState?: any;
  details: SpineStreamChunk[];
}

export interface SpineStreamChunk {
  stage: string;
  timestamp: number;
  output: any;
}

export class YuaSpine {
  private input = "";
  private instanceId!: string;
  private state: Record<string, any> = {};
  private details: SpineStreamChunk[] = [];

  private gen59 = new YuaGen59Lite();
  private memory = new YuaMemoryEngine();
  private math = new SpineMathLayer();
  private vision = new VisionEngine();
  private document = new DocumentEngine();
  private generation = new GenerationEngine();

  // -------------------------------------------------------------
  // Set input
  // -------------------------------------------------------------
  setInput(text: string) {
    this.input = text;
    return this;
  }

  // -------------------------------------------------------------
  // STREAM PIPELINE (SSE 지원)
  // -------------------------------------------------------------
  async *runStream(input: SpineInput): AsyncGenerator<SpineStreamChunk> {
    this.setInput(input.text);
    this.instanceId = input.instanceId ?? "default-instance";
    const path = input.path;

    // -------------------------------------------------------------
    // 1) Memory Search 단계
    // -------------------------------------------------------------
    try {
      const mem = await this.memory.search(this.input, 5);

      const chunk: SpineStreamChunk = {
        stage: "memorySearch",
        timestamp: Date.now(),
        output: mem,
      };

      this.details.push(chunk);
      this.state["memorySearch"] = mem;

      yield chunk;
    } catch (err) {
      yield {
        stage: "memorySearch",
        timestamp: Date.now(),
        output: { error: true, message: String(err) },
      };
    }

    // -------------------------------------------------------------
    // 2) 각 엔진 실행 스테이지 정의 (타입 완전 고정)
    // -------------------------------------------------------------
    const stages: Array<[string, () => Promise<any>]> = [
      ["dve", () => yuaDve.run({ text: this.input })],
      ["security", () => yuaSecurity.run({ apiKey: "internal" })],
      ["esie", () => yuaEsieEngine.run({ text: this.input })],
      ["hpe", () => yuaHpeEngine.run({ text: this.input })],
      ["gen59", () => this.gen59.run(this.input)],

      // ---------------------------------------------------------
      // ⭐ MATH STAGE — mathType 전달 핵심 지점
      // ---------------------------------------------------------
      [
        "math",
        async () => {
          const hasMath =
            /[\d=+\-*/^]/.test(this.input) &&
            (this.input.includes("=") || this.input.match(/\d+/));

          // ❗ 수학 아님 → 명시적 skip + 안전한 meta
          if (!hasMath) {
            const skipped = {
              skipped: true,
              ok: true,
              verified: true,
              meta: {
                mathType: "UNKNOWN",
                skipped: true,
              },
            };
            this.state["math"] = skipped;
            return skipped;
          }

          const result = await this.math.run({
   expression: this.input,
 });

          // 🔑 그대로 state에 저장 (Bandit / Omega / ChatEngine용)
          this.state["math"] = result;
          // 🔁 STEP C: Math → Judgment feedback
          feedbackFromCapability({
            instanceId: this.instanceId,
            input: this.input,
            path,
            confidence: result.verified ? 0.95 : 0.5,
            reason: "math_result",
            stage: "engine",
          });

          return result;
        },
      ],

      ["omega", async () => ({ text: this.input, confidence: 0.92 })],
      ["quantumV1", () => runQuantumEngine(this.input)],
      [
        "quantumV2",
        async () => {
          const q = await runQuantumEngineV2(this.input);

          feedbackFromCapability({
            instanceId: this.instanceId,
            input: this.input,
            path,
            confidence: q?.confidence ?? 0.6,
            reason: "quantum_result",
            stage: "engine",
          });

          return q;
        },
      ],
      ["sfe", () => yuaSfeLayer.run({ primary: this.state.gen59, secondary: [] })],
      ["mgl", () => yuaMgl.run({ candidates: [] })],
      ["cps", () => yuaCps.run({ candidates: [] })],
      ["csk", () => yuaCsk.run({ stateVectors: [] })],
      ["suv", () => yuaSuv.run({})],
      [
        "capability",
        async () => {
          
        
          // 1️⃣ 문서 요약 / 재구성
          const docResult = await this.document.execute({
            instanceId: this.instanceId,
            text: this.input,
            mode: "summary",
            originalInput: this.input,
            path,
          });

          // 2️⃣ 최종 응답 생성 (톤/형식 통제)
          const genResult = await this.generation.execute({
            instanceId: this.instanceId,
            prompt: docResult.output,
            tone: "neutral",
            originalInput: this.input,
            path,
          });

          return {
            document: docResult,
            generation: genResult,
          };
        },
      ],
    ];

    // -------------------------------------------------------------
    // 3) Pipeline 실행 루프
    // -------------------------------------------------------------
    for (const [stage, runner] of stages) {
      try {
        const out = await runner();

        const chunk: SpineStreamChunk = {
          stage,
          timestamp: Date.now(),
          output: out,
        };

        this.details.push(chunk);
        this.state[stage] = out;

        yield chunk;
      } catch (err) {
        yield {
          stage,
          timestamp: Date.now(),
          output: { error: true, message: String(err) },
        };
      }
    }
  }

  // -------------------------------------------------------------
  // FINAL OUTPUT + Memory 저장
  // -------------------------------------------------------------
  async run(input: SpineInput): Promise<SpineFinalOutput> {
    for await (const _ of this.runStream(input)) {}

    // -------------------------------------------------------------
    // 🔥 State Aggregation (NON-BLOCKING, SUMMARY ONLY)
    // -------------------------------------------------------------
    const latestStability =
      this.state["csk"]?.metrics ??
      this.state["csk"] ??
      undefined;

    const latestMemory =
      this.state["memorySearch"]?.results?.[0]?.meta ??
      undefined;

    const aggregatedState = yuaStateAggregator.aggregate({
      stability: latestStability,
      memoryMeta: {
        index: latestMemory?.index,
        deltaNorm: latestMemory?.deltaNorm,
      },
      prevState: input.prevState,
    });

    this.state["aggregatedState"] = aggregatedState;

    const suv = this.state["suv"] ?? {};

    // -------------------------------------------------------------
    // MemoryEngine 자동 저장
    // -------------------------------------------------------------
    const memoryAdded = await this.memory.store(`${Date.now()}`, this.input, {
      esie: this.state.esie ?? null,
      stability: this.state.csk?.stability ?? 0,
      userId: input.userId ?? "anon",
    });

    return {
      finalText:
        this.state.capability?.generation?.output ??
        suv?.finalState?.text ??
        this.input,
      stateVector: suv?.finalState?.vector ?? [],
      stability: suv?.stability ?? 0.8,
      memoryAdded,
      aggregatedState: this.state["aggregatedState"],
      details: this.details,
    };
  }
}

export const yuaSpine = new YuaSpine();
export default yuaSpine;
