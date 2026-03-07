"use client";

import type { SuggestionPayload } from "@/types/suggestion";
import type {
  SuggestionAffordance,
  SuggestionContext,
} from "@/lib/suggestionTypes";
import { pickCopy } from "@/lib/pickCopy";

type Props = {
  payload: SuggestionPayload;
  context?: SuggestionContext;
};

export default function SuggestionBlock({
  payload,
  context = "GENERAL",
}: Props) {
  if (!payload?.items?.length) return null;

  const seen = new Set<string>();


  return (
    <div className="mt-4 border-t pt-3 text-sm text-gray-600">
      <ul className="space-y-1">
        {payload.items.map((item) => {
          const affordance =
            item.label as SuggestionAffordance;

            if (seen.has(affordance)) return null;
            seen.add(affordance);

          
          const text = pickCopy(affordance, context);
          if (!text) return null;

          return (
            <li
              key={item.id}
              className="leading-relaxed"
            >
              {text}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
