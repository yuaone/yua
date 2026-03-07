import type { SuggestionPayload } from "yua-shared/types/suggestion";
import type { SuggestionAffordance } from "@/lib/suggestion/suggestionTypes";

export function normalizeSuggestionPayload(input: any): SuggestionPayload | null {
  const items = input?.items;
  const keys = input?.keys;

  const rawItems: any[] = Array.isArray(items)
    ? items
    : Array.isArray(keys)
    ? keys.map((k: string, i: number) => ({ id: `k${i}`, label: k }))
    : [];

  if (rawItems.length === 0) return null;

  const toAffordance = (label: string): SuggestionAffordance | null => {
    if (label === "EXPAND" || label === "CLARIFY" || label === "BRANCH") {
      return label;
    }
    return null;
  };

  const normalizedItems = rawItems
    .map((it, i) => {
      const rawLabel = String(it.label ?? "");
      const aff = toAffordance(rawLabel);
      if (!aff) return null;
      return {
        id: String(it.id ?? `s${i}`),
        label: aff,
        intent: it.intent ?? "CONTINUE",
        meta: { ...(it.meta ?? {}), rawLabel },
      };
    })
    .filter(Boolean) as SuggestionPayload["items"];

  if (normalizedItems.length === 0) return null;

  return { items: normalizedItems };
}
