import type { ImplicitMemoryResult } from "./memory-implicit-detector";

const HEDGING_RE = /아마|maybe|같은데|probably|것\s*같아|모르겠|not\s+sure/i;
const TEMPORAL_RE = /오늘|지금|방금/;
const FIRST_PERSON_KO_RE = /나는/;
const FIRST_PERSON_EN_RE = /\bI\s/;

const MAX_PATTERN_STRENGTH = 0.15;
const MAX_MESSAGE_LENGTH = 0.1;
const FIRST_PERSON_BONUS = 0.1;
const MAX_AMBIGUITY_PENALTY = 0.2;
const TEMPORAL_PENALTY = 0.15;
const LENGTH_DIVISOR = 200;

function patternStrength(matchCount: number): number {
  if (matchCount <= 1) return 0;
  return Math.min(MAX_PATTERN_STRENGTH, (matchCount - 1) * 0.05);
}

function messageLengthBonus(length: number): number {
  return Math.min(MAX_MESSAGE_LENGTH, length / LENGTH_DIVISOR);
}

function firstPersonBonus(message: string): number {
  if (FIRST_PERSON_KO_RE.test(message) || FIRST_PERSON_EN_RE.test(message)) {
    return FIRST_PERSON_BONUS;
  }
  return 0;
}

function ambiguityPenalty(message: string): number {
  if (!HEDGING_RE.test(message)) return 0;
  const matches = message.match(new RegExp(HEDGING_RE.source, "gi"));
  if (!matches) return 0;
  return Math.min(MAX_AMBIGUITY_PENALTY, matches.length * 0.1);
}

function temporalPenalty(message: string): number {
  return TEMPORAL_RE.test(message) ? TEMPORAL_PENALTY : 0;
}

export function scoreImplicitCandidate(
  result: ImplicitMemoryResult,
  message: string
): number {
  if (result.category === "NONE") return 0;

  const raw =
    result.confidence +
    patternStrength(countSignals(result, message)) +
    messageLengthBonus(message.length) +
    firstPersonBonus(message) -
    ambiguityPenalty(message) -
    temporalPenalty(message);

  return Math.max(0, Math.min(1, raw));
}

function countSignals(
  result: ImplicitMemoryResult,
  message: string
): number {
  let count = 0;
  if (FIRST_PERSON_KO_RE.test(message) || FIRST_PERSON_EN_RE.test(message))
    count++;
  if (message.length > 20) count++;
  if (result.confidence >= 0.8) count++;
  return count;
}
