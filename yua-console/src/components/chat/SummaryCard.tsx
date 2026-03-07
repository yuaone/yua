"use client";

type Props = {
  summary: string;
  suggestions?: string[];
  onSelect?: (q: string) => void;
};

export default function SummaryCard({
  summary,
  suggestions = [],
  onSelect,
}: Props) {
  return (
    <div className="mt-8 w-full max-w-[720px] rounded-2xl border bg-white/90 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight text-black">
          Conversation Summary
        </h3>
      </div>

      {/* Summary */}
      <p className="text-[15px] leading-[1.7] text-black/80 whitespace-pre-wrap">
        {summary}
      </p>

      {/* Divider */}
      {suggestions.length > 0 && (
        <div className="my-4 h-px w-full bg-black/10" />
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <>
          <div className="mb-2 text-xs text-black/50">
            Suggested next actions
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestions.map((q, i) => (
              <button
                key={i}
                onClick={() => onSelect?.(q)}
                className="
                  rounded-full border
                  px-3 py-1 text-xs
                  text-black/80
                  hover:bg-black/5
                  transition
                "
              >
                {q}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
