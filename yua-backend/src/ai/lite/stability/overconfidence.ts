export function suppressOverconfidence(
  p: number,
  clip = 0.95,
  k = 8
) {
  if (p <= clip) return p;

  const excess = p - clip;          // 초과분
  const damped = excess / (1 + k * excess);

  return clip + damped;
}
