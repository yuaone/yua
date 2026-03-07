// ===================================================================
// createContext — SSOT 10.0 FINAL
// Initializes QGML execution context for Shell + Engines
// ===================================================================

import crypto from "crypto";
import type { QGMLContext } from "../types/context";

export function createContext(
  input: string = "",
  mode: "yua" | "linux" = "yua",
  debug = false
): QGMLContext {
  const logs: QGMLContext["logs"] = [];

  return {
    input,
    mode,
    debug,
    executionId: crypto.randomUUID(),
    timestamp: Date.now(),

    // parser MUST be injected by runtime
    parser: () => {
      throw new Error("Parser not injected into QGMLContext");
    },

    // engine blocks
    currentQuantumBlock: [],
    currentParallelBlock: [],
    currentTimeline: [],
    currentFuture: [],
    currentScenario: [],
    currentBranch: {},

    // DBs
    memory: {
      recent: [],
      longterm: [],
    },

    logicDB: {
      facts: [],
      rules: [],
    },

    flows: {},
    defines: {},
    scenarios: {},

    // shell state
    env: {
      PWD: "/",
      USER: "yua",
      OS: "YUA-OS",
      VERSION: "1.0.0",
    },

    cwd: "/",

    fs: {
      "/": {
        type: "dir",
        children: {},
      },
    },

    processes: [],

    engines: {
      math: { enabled: true },
      system: { enabled: true },
      c: { enabled: true },
      quantum: { enabled: true },
      parallel: { enabled: true },
      logic: { enabled: true },
      tensor: { enabled: true },
      memory: { enabled: true },
      llm: { enabled: true },
      db: { enabled: true },
    },

    logs,
    log: (level, message) => {
      logs.push({ level, message, time: Date.now() });
    },
  };
}
