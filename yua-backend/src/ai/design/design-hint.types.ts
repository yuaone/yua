export type DesignStage =
  | "INTENT"
  | "CONSTRAINT"
  | "OPTIONS"
  | "RISKS"
  | "TRADEOFFS";

export interface DesignHint {
  stage: DesignStage;
  observations: string[];
  confidence: number;
}
