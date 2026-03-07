// 📂 src/ai/yua/yua-state-aggregator.ts
// -------------------------------------------------------------
// ⚡ YUA-AI State Aggregator v1.0
// -------------------------------------------------------------
// Contract (SSOT)
// - This module DOES NOT decide or route
// - This module DOES NOT block execution
// - This module ONLY summarizes temporal state
//
// Inputs:
// - Memory search/store results (deltaNorm, index)
// - Stability metrics (mu, jacobian, timeSeries)
//
// Outputs:
// - statePhase: STABLE | SHIFT | RISK
// - trendConfidence: 0 ~ 1
// - optional StateTransition
// -------------------------------------------------------------

import { StabilityMetrics, StateTransition } from "./yua-types";

export type StatePhase = "STABLE" | "SHIFT" | "RISK";

export interface AggregatedState {
  statePhase: StatePhase;
  trendConfidence: number;
  transition?: StateTransition;
  timestamp: number;
  debug?: Record<string, any>;
}

export interface StateAggregatorInput {
  /** latest stability metrics */
  stability?: StabilityMetrics;

  /** memory meta fields (optional, no hard dependency) */
  memoryMeta?: {
    index?: number;
    deltaNorm?: number;
  };

  /** previous aggregated state (optional) */
  prevState?: AggregatedState;
}

export class YuaStateAggregator {
  constructor() {}

  // -------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------
  aggregate(input: StateAggregatorInput): AggregatedState {
    const { stability, memoryMeta, prevState } = input;

    const mu = stability?.mu ?? 0;
    const jac = stability?.jacobian ?? 0;

    const velocity = stability?.timeSeries?.velocity;
    const acceleration = stability?.timeSeries?.acceleration;

    const deltaNorm = memoryMeta?.deltaNorm ?? 0;

    // ---------------------------------------------------------
    // 1) Phase classification (pure heuristic, no side effects)
    // ---------------------------------------------------------
    let phase: StatePhase = "STABLE";

    if (mu >= 0.85 || jac >= 6 || deltaNorm >= 1.2) {
      phase = "RISK";
    } else if (
      mu >= 0.5 ||
      jac >= 3 ||
      (velocity !== undefined && Math.abs(velocity) > 0.8)
    ) {
      phase = "SHIFT";
    }

    // ---------------------------------------------------------
    // 2) Trend confidence estimation
    // ---------------------------------------------------------
    let confidence = 0.6;

    if (phase === "STABLE") confidence = 0.8;
    if (phase === "SHIFT") confidence = 0.6;
    if (phase === "RISK") confidence = 0.4;

    // penalty for unstable acceleration
    if (acceleration !== undefined && Math.abs(acceleration) > 1) {
      confidence -= 0.1;
    }

    confidence = Math.max(0, Math.min(1, confidence));

    // ---------------------------------------------------------
    // 3) State transition detection (optional)
    // ---------------------------------------------------------
    let transition: StateTransition | undefined;

    if (prevState && prevState.statePhase !== phase) {
      transition = {
        fromState: prevState.statePhase,
        toState: phase,
        probability: Math.min(
          1,
          Math.abs(mu - (prevState.debug?.mu ?? 0)) + 0.3
        ),
        basedOn: "stability",
        timestamp: Date.now(),
      };
    }

    // ---------------------------------------------------------
    // 4) Output
    // ---------------------------------------------------------
    return {
      statePhase: phase,
      trendConfidence: confidence,
      transition,
      timestamp: Date.now(),
      debug: {
        mu,
        jacobian: jac,
        velocity,
        acceleration,
        deltaNorm,
      },
    };
  }
}

// default singleton (optional usage)
export const yuaStateAggregator = new YuaStateAggregator();
export default yuaStateAggregator;
