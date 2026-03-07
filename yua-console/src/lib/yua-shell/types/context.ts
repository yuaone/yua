// ===================================================================
// QGMLContext — SSOT 10.0 FINAL FIXED
// ===================================================================

import type { QGMLNode } from "./qgml-node";
import type { EngineResult } from "./engine-result";

export interface MemoryItem {
  text: string;
  emb: number[];
}

export interface QGMLContext {
  // --------------------------------------------------------------
  // Execution meta
  // --------------------------------------------------------------
  input: string;
  mode: "yua" | "linux";
  executionId: string;
  timestamp: number;
  debug: boolean;

  // --------------------------------------------------------------
  // Parser (runtime must inject)
  // --------------------------------------------------------------
  parser: (line: string) => QGMLNode;

  // --------------------------------------------------------------
  // Engine block context
  // --------------------------------------------------------------
  currentQuantumBlock: string[];
  currentParallelBlock: string[];

  currentTimeline?: string[];
  currentFuture?: string[];
  currentScenario?: string[];
  currentBranch?: Record<string, string[]>;

  // --------------------------------------------------------------
  // Runtime Databases
  // --------------------------------------------------------------
  memory: {
    recent: MemoryItem[];     // ⬅ FIXED
    longterm: MemoryItem[];   // ⬅ FIXED
  };

  logicDB: {
    facts: string[];
    rules: Array<{ head: string; body: string[] }>;
  };

  flows: Record<string, string[]>;
  defines: Record<string, string[]>;
  scenarios?: Record<string, string[]>;

  // --------------------------------------------------------------
  // Shell State
  // --------------------------------------------------------------
  env: Record<string, string>;
  cwd: string;

  fs: Record<string, {
    type: "dir" | "file";
    children?: Record<string, any>;
    content?: string;
  }>;

  // --------------------------------------------------------------
  // Process Management
  // --------------------------------------------------------------
  processes: Array<{ pid: number; status: string; meta?: any }>;

  // --------------------------------------------------------------
  // Engines Registry
  // --------------------------------------------------------------
  engines: Record<string, { enabled: boolean }>;   // ⬅ Router와 호환됨

  // --------------------------------------------------------------
  // Logs
  // --------------------------------------------------------------
  logs: Array<{ level: "info" | "warn" | "error"; message: string; time: number }>;
  log: (level: "info" | "warn" | "error", msg: string) => void;
}
