// Align Mentor — 의도/정책 정렬 담당

export function AgentAlign(input: string) {
  return {
    role: "align",
    intent: "positive",
    alignmentScore: Math.random() * 0.95
  };
}
