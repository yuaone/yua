import { suggestionCopyMap } from "./suggestionCopy";
import type { SuggestionAffordance, SuggestionContext } from "./suggestionTypes";

export function pickCopy(
  affordance: SuggestionAffordance,
  context: SuggestionContext
): string | null {
  const byAffordance = suggestionCopyMap[affordance];
  if (!byAffordance) return null;

  const pool = byAffordance[context] ?? byAffordance.GENERAL;
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
