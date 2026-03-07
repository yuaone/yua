export function computeRiskBalance({
  fpCost,
  fnCost,
  tau,
}: {
  fpCost: number;     // False Positive 비용
  fnCost: number;     // False Negative 비용
  tau: number;        // AOSS 임계값
}) {
  return (tau + fpCost) / fnCost;
}
