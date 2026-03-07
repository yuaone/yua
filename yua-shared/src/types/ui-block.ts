import type { SuggestionItem } from "./suggestion";

export type UIBlock =
  | { type: "markdown"; content: string }
  | { type: "section"; title: string }
  | { type: "divider" }
  | { type: "suggestions"; items: SuggestionItem[] };
