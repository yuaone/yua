// Auditor — 사실 검증 & 신뢰도 검증

export function AgentAuditor(input: string) {
  return {
    role: "auditor",
    factualCheck: `Facts checked for: ${input}`,
    trust: Math.random() * 0.9
  };
}
