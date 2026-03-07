// src/ai/yua/yua-hpe.ts

import { logger } from "../../utils/logger";

/**
 * HPE 버전 타입
 * - "v3" : HPE 3.0 (기존 Precision 중심)
 * - "v7" : HPE 7.0 (Causal Graph + Fusion)
 * - "auto" : 입력/메타데이터 기반 자동 선택
 */
export type HpeVersion = "v3" | "v7" | "auto";

/**
 * HPE 엔진에 들어가는 기본 입력 구조
 * 나중에 GCP에서 Unified Schema(UES) 설계할 때
 * 여기 타입을 확장하거나 교체하면 됨.
 */
export interface HpeInput {
  text: string;
  metadata?: Record<string, unknown>;
  // 나중에 schema 작업 시: embeddings, state, intent 등 추가 예정
}

/**
 * HPE 엔진의 출력 구조 (임시 버전)
 * - 나중에 UES(OutputSchema)와 맞출 때 필드 정리/통합 예정
 */
export interface HpeOutput {
  refinedText: string;
  precisionScore: number; // 0 ~ 1
  causalScore: number;    // 0 ~ 1
  stabilityScore: number; // 0 ~ 1
  version: HpeVersion;
  meta?: Record<string, unknown>;
}

/**
 * HPE 실행 옵션
 */
export interface HpeOptions {
  version?: HpeVersion;
  // 나중에: temperature, maxDepth 등 추가 가능
}

/**
 * HPE Wrapper 클래스
 * - HPE 3.0 / 7.0 / AUTO 모드를 하나로 묶어주는 엔진
 * - 지금은 "빌드 통과 + 이후 확장"에 초점을 둔 기본 구조만 제공
 */
export class YuaHpeEngine {
  private defaultVersion: HpeVersion = "auto";

  constructor(config?: { defaultVersion?: HpeVersion }) {
    if (config?.defaultVersion) {
      this.defaultVersion = config.defaultVersion;
    }
  }

  /**
   * HPE 실행의 public 엔트리 포인트
   * - 외부에서 이 메서드만 호출하면 됨
   * - 나중에 /engine/spine, /ai/risk 등에서 여기 래핑 가능
   */
  async run(input: HpeInput, options?: HpeOptions): Promise<HpeOutput> {
    const version = options?.version ?? this.defaultVersion;

    logger.info("[YuaHpeEngine] run called", {
      version,
      hasMetadata: !!input.metadata
    });

    const selectedVersion = this.selectVersion(input, version);

    const base = this.createBaseOutput(input, selectedVersion);
    const scored = this.applyScoringHeuristics(base, selectedVersion);

    return scored;
  }

  /**
   * HPE 버전 선택 로직
   * - 현재는 간단한 휴리스틱
   * - 나중에 UES + GCP에서 메타데이터 기반으로 정교하게 확장 가능
   */
  private selectVersion(input: HpeInput, version: HpeVersion): HpeVersion {
    if (version !== "auto") return version;

    const length = input.text?.length ?? 0;

    // 예시 정책:
    // - 짧은 텍스트: v3 (Precision 중심)
    // - 긴 텍스트: v7 (Causal/Fusion 중심)
    if (length < 400) {
      return "v3";
    }

    return "v7";
  }

  /**
   * 기본 출력 구조 생성
   * - 지금은 입력 텍스트를 그대로 refinedText로 반환
   * - 나중에 HPE 실제 로직 붙일 때 이 부분 교체
   */
  private createBaseOutput(input: HpeInput, version: HpeVersion): HpeOutput {
    return {
      refinedText: input.text,
      precisionScore: 0.0,
      causalScore: 0.0,
      stabilityScore: 0.0,
      version,
      meta: {
        ...input.metadata,
        hpeTimestamp: Date.now()
      }
    };
  }

  /**
   * 간단한 스코어 휴리스틱
   * - HPE 3.0 / 7.0의 특성을 "점수 패턴"으로만 가볍게 흉내
   * - 실제 HPE 로직은 나중에 이 부분 교체/확장
   */
  private applyScoringHeuristics(
    output: HpeOutput,
    version: HpeVersion
  ): HpeOutput {
    const lengthFactor = Math.min(1, (output.refinedText.length || 0) / 1000);

    if (version === "v3") {
      return {
        ...output,
        precisionScore: 0.7 + 0.3 * lengthFactor,
        causalScore: 0.4 + 0.2 * lengthFactor,
        stabilityScore: 0.8
      };
    }

    if (version === "v7") {
      return {
        ...output,
        precisionScore: 0.6 + 0.2 * lengthFactor,
        causalScore: 0.7 + 0.3 * lengthFactor,
        stabilityScore: 0.75
      };
    }

    // auto에서 v3/v7이 정해졌을 때 이미 위에서 처리되므로
    // 여기로 오는 경우는 거의 없음. 안전용 fallback.
    return {
      ...output,
      precisionScore: 0.5,
      causalScore: 0.5,
      stabilityScore: 0.5
    };
  }
}

// 사용 편의를 위한 기본 인스턴스 (선택적으로 쓸 수 있음)
export const yuaHpeEngine = new YuaHpeEngine();
export default yuaHpeEngine;
