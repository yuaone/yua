import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { useSidebarData } from "@/hooks/useSidebarData";

type Props = {
  threadId: number;
  title: string;
  createdAt: number;
  active?: boolean;
  pinned?: boolean;
  onClick(): void;
  onOpenMenu(e: React.MouseEvent): void;
};

export function ThreadItem({
  threadId,
  title,
  createdAt,
  active = false,
  pinned,
  onClick,
  onOpenMenu,
}: Props) {
  const { editingThreadId, stopEditingThread } = useSidebarStore();
  const { renameThread } = useSidebarData();

  const editing = editingThreadId === threadId;

  const [value, setValue] = useState(title);
  const [displayTitle, setDisplayTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevTitleRef = useRef(title);

  /* =========================
     Sync title + Typing animation
  ========================= */
  useEffect(() => {
    if (editing) return;
    setValue(title);

    const prev = prevTitleRef.current;
    prevTitleRef.current = title;

    // First render or same title -- no animation
    if (!prev || prev === title) {
      setDisplayTitle(title);
      return;
    }

    // Animate: type out the new title character by character
    setDisplayTitle("");
    let i = 0;
    const timer = window.setInterval(() => {
      i++;
      setDisplayTitle(title.slice(0, i));
      if (i >= title.length) {
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [title, editing]);

  /* =========================
     Auto focus
  ========================= */
  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);

  const submit = () => {
    const next = value.trim();
    if (next && next !== title) {
      renameThread(threadId, next);
    }
    stopEditingThread();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group w-full text-left",
        "flex items-center gap-2",
        "rounded-lg px-2 py-1.5 transition",
        active
          ? "bg-[var(--sb-soft)] text-[var(--sb-ink)]"
          : "hover:bg-[var(--sb-soft)] text-[var(--sb-ink)]",
      ].join(" ")}
    >
      {/* left marker */}
      <div className="shrink-0">
        {pinned ? (
          <div
            className={[
              "h-2 w-2 rounded-full",
              active ? "bg-[var(--sb-ink)]" : "bg-[var(--sb-ink-2)]",
            ].join(" ")}
            title="Pinned"
          />
        ) : (
          <div className="h-2 w-2 rounded-full bg-transparent" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") {
                setValue(title);
                stopEditingThread();
              }
            }}
            className={[
              "w-full rounded-xl px-3 py-2 text-[14px] font-semibold outline-none",
              "bg-[var(--surface-panel)] text-[var(--sb-ink)] ring-2 ring-[var(--sb-line)]",
            ].join(" ")}
          />
        ) : (
          <div
            className={[
              "flex items-center truncate text-[15px] leading-[1.25]",
              active
                ? "font-semibold text-[var(--sb-ink)]"
                : "font-medium text-[var(--sb-ink)]",
            ].join(" ")}
          >
            <span className="truncate">{displayTitle || "New Chat"}</span>
          </div>
        )}
      </div>

      {/* menu button */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onOpenMenu(e);
        }}
        className={[
          "ml-1 grid h-8 w-8 place-items-center rounded-xl transition",
          "opacity-70 group-hover:opacity-100 focus:opacity-100",
          "hover:bg-[var(--sb-soft)]",
        ].join(" ")}
        aria-label="thread-menu"
      >
        <MoreHorizontal size={18} className="text-[var(--sb-ink)]" />
      </div>
    </button>
  );
}
