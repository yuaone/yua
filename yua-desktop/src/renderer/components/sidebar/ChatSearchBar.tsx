import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";

type Props = {
  messages: { id: string; content: string; role: string }[];
  onClose: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
};

export default function ChatSearchBar({
  messages,
  onClose,
  scrollContainerRef,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [matchIds, setMatchIds] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (e.metaKey || e.shiftKey) goToPrev();
        else goToNext();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, matchIds, activeIdx]);

  // Update matches when query changes
  useEffect(() => {
    if (!query.trim()) {
      setMatchIds([]);
      setActiveIdx(0);
      clearHighlights();
      return;
    }

    const q = query.toLowerCase();
    const ids = messages
      .filter((m) => m.content.toLowerCase().includes(q))
      .map((m) => m.id);

    setMatchIds(ids);
    setActiveIdx(ids.length > 0 ? 0 : -1);

    if (ids.length > 0) {
      scrollToMessage(ids[0]);
    }
  }, [query, messages]);

  const scrollToMessage = useCallback(
    (messageId: string) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const el = container.querySelector(
        `[data-message-id="${messageId}"]`
      );
      if (!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Briefly highlight the message
      el.classList.add("search-highlight-active");
      setTimeout(
        () => el.classList.remove("search-highlight-active"),
        2000
      );
    },
    [scrollContainerRef]
  );

  const clearHighlights = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container
      .querySelectorAll(".search-highlight-active")
      .forEach((el) => {
        el.classList.remove("search-highlight-active");
      });
  }, [scrollContainerRef]);

  const goToNext = useCallback(() => {
    if (matchIds.length === 0) return;
    const next = (activeIdx + 1) % matchIds.length;
    setActiveIdx(next);
    scrollToMessage(matchIds[next]);
  }, [activeIdx, matchIds, scrollToMessage]);

  const goToPrev = useCallback(() => {
    if (matchIds.length === 0) return;
    const prev = (activeIdx - 1 + matchIds.length) % matchIds.length;
    setActiveIdx(prev);
    scrollToMessage(matchIds[prev]);
  }, [activeIdx, matchIds, scrollToMessage]);

  return (
    <div
      className="
      sticky top-0 z-30
      flex items-center gap-2 px-4 py-2
      bg-[var(--surface-panel)] border-b border-[var(--line)]
      shadow-sm
    "
    >
      <Search size={16} className="shrink-0 text-[var(--text-muted)]" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search messages..."
        className="
          flex-1 bg-transparent text-sm text-[var(--text-primary)]
          placeholder:text-[var(--text-muted)]
          outline-none
        "
      />

      {query && (
        <span className="shrink-0 text-xs text-[var(--text-muted)] tabular-nums">
          {matchIds.length > 0
            ? `${activeIdx + 1} / ${matchIds.length}`
            : "0 results"}
        </span>
      )}

      <div className="flex items-center gap-0.5">
        <button
          onClick={goToPrev}
          disabled={matchIds.length === 0}
          className="p-1 rounded hover:bg-[var(--sb-soft)] disabled:opacity-30 transition"
          aria-label="Previous result"
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={goToNext}
          disabled={matchIds.length === 0}
          className="p-1 rounded hover:bg-[var(--sb-soft)] disabled:opacity-30 transition"
          aria-label="Next result"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-[var(--sb-soft)] transition"
        aria-label="Close search"
      >
        <X size={16} />
      </button>
    </div>
  );
}
