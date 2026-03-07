// Synthesizer — 최종 결론 생성기 (팀 리더)

export function AgentSynthesizer(agents: any[]) {
  const final = agents.map(a => `[${a.role}]`).join(" ");

  return {
    role: "synthesizer",
    message: `Result synthesized from: ${final}`,
    agents
  };
}
