// 🔒 STEP 6 — Stream Output Guard (FINAL, FIXED)

type UnsafeKeys =
  | "confidence"
  | "source"
  | "ruleId"
  | "rules"
  | "lifecycle"
  | "internal"
  | "trace"
  | "debug";

const FORBIDDEN_KEYS = new Set<UnsafeKeys>([
  "confidence",
  "source",
  "ruleId",
  "rules",
  "lifecycle",
  "internal",
  "trace",
  "debug",
]);

export function guardStreamOutput<T extends Record<string, any>>(
  payload: T
): Omit<T, UnsafeKeys> {
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (FORBIDDEN_KEYS.has(key as UnsafeKeys)) continue;
    safe[key] = value;
  }

  return safe as Omit<T, UnsafeKeys>;
}
