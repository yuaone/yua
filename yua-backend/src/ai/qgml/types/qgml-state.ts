// 🔒 QGML STATE — SSOT FINAL

export interface QGMLWorldState {
  entities: Record<string, any>;
  relations: Record<string, any>;
  system: Record<string, any>;
}

export interface QGMLEmotionState {
  valence: number;
  arousal: number;
  dominance: number;
}

export interface QGMLMemoryState {
  [memoryName: string]: unknown[];
}

export interface QGMLRuntimeState {
  world: QGMLWorldState;
  emotion: QGMLEmotionState;
  memory: QGMLMemoryState;
  timestamp: number;
}
