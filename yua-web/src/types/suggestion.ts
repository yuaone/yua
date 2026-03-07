export type SuggestionItem = {
  id: string;
  label: string;
  intent:
    | "CONTINUE"
    | "COMPARE"
    | "STRUCTURE"
    | "APPLY"
    | "SUMMARIZE";
  emoji?: string;
  meta?: Record<string, any>;
};

export type SuggestionPayload = {
  items: SuggestionItem[];
};
