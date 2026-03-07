import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

type EngineType = "gen59" | "omega" | "quantum" | "hpe";

interface EngineState {
  lastCall: number;
  callCount: number;
}

type InstanceEngineState = Record<EngineType, EngineState>;

const instanceStates: Record<string, InstanceEngineState> = {};

const LIMITS = {
  GEN59_COOLDOWN: 1500,
  OMEGA_MAX_CALLS: 20,
  WINDOW: 60 * 1000,
  PROTECTIVE_DELAY: 300,
};

function getInstanceState(instanceId: string): InstanceEngineState {
  if (!instanceStates[instanceId]) {
    instanceStates[instanceId] = {
      gen59: { lastCall: 0, callCount: 0 },
      omega: { lastCall: 0, callCount: 0 },
      quantum: { lastCall: 0, callCount: 0 },
      hpe: { lastCall: 0, callCount: 0 },
    };
  }
  return instanceStates[instanceId];
}

// --------------------------------------------------
// ★ SSOT REQUIRED NAME — DO NOT CHANGE
// --------------------------------------------------
export function aiEngineLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const engine = req.body?.engine as EngineType | undefined;
    const instanceId =
      req.body?.instanceId ||
      req.params?.id ||
      (req as any).instanceId;

    if (!engine) {
      return res.status(400).json({ error: "engine type required" });
    }

    if (!instanceId) {
      return res.status(400).json({ error: "instanceId required" });
    }

    const now = Date.now();
    const state = getInstanceState(instanceId)[engine];

    // --------------------------------------------------
    // GEN59 — Cooldown
    // --------------------------------------------------
    if (engine === "gen59") {
      const diff = now - state.lastCall;
      if (diff < LIMITS.GEN59_COOLDOWN) {
        return res.status(429).json({
          error: "Gen59 cooldown in effect",
          wait: LIMITS.GEN59_COOLDOWN - diff,
          instanceId,
        });
      }
      state.lastCall = now;
    }

    // --------------------------------------------------
    // OMEGA — Windowed Rate Limit
    // --------------------------------------------------
    if (engine === "omega") {
      if (now - state.lastCall > LIMITS.WINDOW) {
        state.callCount = 0;
        state.lastCall = now;
      }

      state.callCount++;

      if (state.callCount > LIMITS.OMEGA_MAX_CALLS) {
        return res.status(429).json({
          error: "Omega rate limit exceeded",
          limit: LIMITS.OMEGA_MAX_CALLS,
          window: LIMITS.WINDOW,
          instanceId,
        });
      }
    }

    // --------------------------------------------------
    // QUANTUM / HPE — Protective Delay
    // --------------------------------------------------
    if (engine === "quantum" || engine === "hpe") {
      const diff = now - state.lastCall;
      if (diff < LIMITS.PROTECTIVE_DELAY) {
        return res.status(429).json({
          error: `${engine} protective delay`,
          wait: LIMITS.PROTECTIVE_DELAY - diff,
          instanceId,
        });
      }
      state.lastCall = now;
    }

    next();
  } catch (e) {
    logger.error("aiEngineLimiter error:", e);
    return res.status(500).json({ error: "aiEngineLimiter failure" });
  }
}
