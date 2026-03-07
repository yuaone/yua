// Predictor — 단기/중기 미래 시나리오 생성

export function AgentPredictor(input: string) {
  return {
    role: "predictor",
    future: [
      `${input} → short-term impact`,
      `${input} → mid-term impact`
    ],
    stability: Math.random() * 0.8 + 0.2
  };
}
