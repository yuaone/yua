// src/ai/statistics/signal-hints.ts
export type SignalHints = {
  conservativeSuggestions?: boolean;
  maxSuggestionCap?: number;
  /**
   * 🔒 Facet Drift Hint (READ ONLY)
   * - 응답 톤/보수성 힌트용
   */
  facetDrift?: {
    existence?: "UP" | "DOWN";
    price?: "UP" | "DOWN";
    performance?: "UP" | "DOWN";
    risk?: "UP" | "DOWN";
    policy?: "UP" | "DOWN";
    timing?: "UP" | "DOWN";
  };
};
