import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  FileText,
  Sparkles,
  Search,
  Clock,
  ChevronLeft,
  Check,
  GitBranch,
} from "lucide-react";
import { useThinkingProfile } from "@/hooks/useThinkingProfile";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";

export default function ChatPlusMenu({
  open,
  onSelect,
  onClose,
}: {
  open: boolean;
  onSelect: (type: string) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { profile, enable } = useThinkingProfile();
  const [view, setView] = useState<"root" | "profile">("root");

  const items = useMemo(
    () =>
      [
        { key: "FAST", label: "Fast", desc: "Minimal processing, quick output" },
        { key: "NORMAL", label: "Normal", desc: "Balanced reasoning and speed" },
        { key: "DEEP", label: "Deep", desc: "Extended reasoning with analysis" },
      ] as { key: ThinkingProfile; label: string; desc: string }[],
    []
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const el = menuRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (el.contains(target)) return;
      onClose();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, onClose]);

  // ESC close
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  if (view === "profile") {
    return (
      <div
        ref={menuRef}
        className="
          absolute bottom-full mb-3 left-0
          w-64 rounded-2xl border bg-white dark:bg-[#1b1b1b] dark:border-[var(--line)]
          shadow-lg p-2 z-30
        "
      >
        <button
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-sm text-gray-900 dark:text-[var(--text-primary)]"
          onClick={() => setView("root")}
          type="button"
        >
          <ChevronLeft size={16} />
          모드
        </button>

        <div className="px-2 py-1 text-[12px] text-gray-400 dark:text-[var(--text-muted)]">
          Thinking Profile
        </div>

        {items.map((it) => {
          const active = it.key === profile;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => {
                enable(it.key);
                onClose();
              }}
              className="
                w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100
                flex items-start gap-2
                text-gray-900 dark:text-[var(--text-primary)] dark:hover:bg-white/10
              "
            >
              <div className="mt-0.5 w-4 shrink-0">
                {active ? <Check size={16} /> : null}
              </div>
              <div>
                <div className="text-sm text-gray-900 dark:text-[var(--text-primary)]">
                  {it.label}
                </div>
                <div className="text-[12px] text-gray-500 dark:text-[var(--text-secondary)]">
                  {it.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="
        absolute bottom-full mb-3 left-0
        w-56 rounded-2xl border bg-white dark:bg-[#1b1b1b] dark:border-[var(--line)]
        shadow-lg p-2 z-30
      "
    >
      <MenuItem
        icon={<Image size={16} />}
        label="이미지"
        onClick={() => {
          onSelect("image");
          onClose();
        }}
      />
      <MenuItem
        icon={<FileText size={16} />}
        label="파일"
        onClick={() => {
          onSelect("file");
          onClose();
        }}
      />
      <MenuItem
        icon={<Sparkles size={16} />}
        label="모드 변경"
        onClick={() => setView("profile")}
      />
      <MenuItem
        icon={<Search size={16} />}
        label="검색"
        onClick={() => {
          onSelect("search");
          onClose();
        }}
      />
      <MenuItem
        icon={<Clock size={16} />}
        label="최근"
        onClick={() => {
          onSelect("recent");
          onClose();
        }}
      />
      <MenuItem
        icon={<GitBranch size={16} />}
        label="가지치기"
        onClick={() => {
          onSelect("fork");
          onClose();
        }}
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="
        flex items-center gap-3
        w-full px-3 py-2 rounded-lg
        hover:bg-gray-100 dark:hover:bg-white/10 text-sm text-gray-900 dark:text-[var(--text-primary)]
      "
    >
      {icon}
      {label}
    </button>
  );
}
