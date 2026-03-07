// 🔒 QGML AST — SSOT FINAL

export type QGMLNodeType =
  | "world"
  | "intent"
  | "emotion"
  | "memory"
  | "policy"
  | "constraint";

export interface QGMLAST {
  world?: WorldNode;
  intent?: IntentNode;
  emotion?: EmotionNode;
  memory?: MemoryNode[];
  policy?: PolicyNode[];
  constraint?: ConstraintNode[];
}

/* ---------------- World ---------------- */

export interface WorldNode {
  entities: EntityNode[];
  relations?: RelationNode[];
  states?: StateNode[];
}

export interface EntityNode {
  name: string;
  type: "human" | "system" | "service" | "agent";
  persistent?: boolean;
  mutable?: boolean;
}

export interface RelationNode {
  from: string;
  to: string;
  access?: string;
  trust?: "none" | "conditional" | "full";
}

export interface StateNode {
  name: string;
  fields: Record<string, "string" | "number" | "boolean" | "time">;
}

/* ---------------- Intent ---------------- */

export interface IntentNode {
  name: string;
  goal: string;
  priority: "low" | "normal" | "high" | "critical";
}

/* ---------------- Emotion ---------------- */

export interface EmotionNode {
  valence: number;
  arousal: number;
  dominance: number;
  inertia?: boolean;
  max_delta?: number;
}

/* ---------------- Memory ---------------- */

export interface MemoryNode {
  name: string;
  type: "episodic" | "semantic" | "procedural";
  retention: "short" | "long" | "permanent";
}

/* ---------------- Policy ---------------- */

export interface PolicyNode {
  name: string;
  deny?: string[];
  allow?: string[];
}

/* ---------------- Constraint ---------------- */

export interface ConstraintNode {
  id: string;
  description?: string;
  lambda: string; // ⚠️ 런타임에서 Function으로 컴파일
}
