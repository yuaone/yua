"use client";

import type { OverlayChunk } from "@/store/useStreamSessionStore";
import Markdown from "@/components/common/Markdown";

type MergedChunk = Omit<OverlayChunk, "title" | "body"> & {
  title?: string | null;
  body?: string | null;
};
type Props = {
  chunks?: OverlayChunk[];
};

function Bullet({
  isFirst,
  isLast,
}: {
  isFirst: boolean;
  isLast: boolean;
}) {
  
  return (
    <div className="relative w-6 shrink-0 flex justify-center items-start">
      {!isFirst && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-1/2 bg-[var(--line)]" />
      )}

      {!isLast && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-1/2 bg-[var(--line)]" />
      )}

      <span className="relative z-10 h-6 w-6 rounded-full bg-[var(--surface-panel)] flex items-center justify-center border border-[var(--line)]">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-muted)]" />
      </span>
    </div>
  );
}

export default function ThinkingPanelBody({
  chunks = [],
}: Props) {
  const visibleChunks = chunks.filter((c) => c.source !== "NARRATION");
  // 🔥 groupIndex 기준으로 병합 (TS-safe)
  const mergedChunks: MergedChunk[] = (() => {
    const map = new Map<string, OverlayChunk[]>();

    for (const c of visibleChunks) {
      const key =
        typeof c.groupIndex === "number"
          ? String(c.groupIndex)
          : `single-${c.chunkId}`;

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }

    return Array.from(map.values()).map((group) => {
      const first = group[0];

      return {
        ...first,
        title: group.map((g) => g.title).filter(Boolean).join(""),
        body: group.map((g) => g.body).filter(Boolean).join("\n\n"),
      };
    });
  })();
  return (
    <div className="space-y-8">
      {mergedChunks.map((c, i) => {
    const hasTitle = typeof c.title === "string" && c.title.trim().length > 0;
    const hasBody = typeof c.body === "string" && c.body.trim().length > 0;
    const hasAny = hasTitle || hasBody;
    if (!hasAny) return null;
 const searchQueries =
   typeof c.groupIndex === "number"
     ? mergedChunks
                .filter(
                  (x) =>
                    x.metaTool === "SEARCH" &&
                    x.groupIndex === c.groupIndex
                )
                .map((x) => x.meta?.query)
                .filter(Boolean)
                .filter(
                  (v, idx, arr) => arr.indexOf(v) === idx
                )
            : [];

        return (
          <div
            key={c.chunkId}
            style={{ animationDelay: `${i * 180}ms` }}
            className="yua-chunk-row animate-yua-bullet"
          >
            <div className="yua-chunk-main">
              <Bullet
                isFirst={i === 0}
                isLast={i === mergedChunks.length - 1}
              />

              <div className="min-w-0">
                {c.title && (
                  <div className="text-[18px] font-semibold text-[var(--text-primary)] leading-[1.65] tracking-[-0.01em]">
                    {c.title}
                  </div>
                )}

                {searchQueries.map((q) => (
                  <div
                    key={q}
                    className="mt-1 text-[14px] text-[var(--text-secondary)]"
                  >
                    • Searching: {q}
                  </div>
                ))}

                {c.body && (
                  <div className="mt-3 text-[17px] text-[var(--text-primary)] leading-[1.75] whitespace-normal break-words">
                    <Markdown
                      content={c.body}
                      streaming={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
