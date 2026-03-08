import { ArrowRightLeft, FolderOpen, Pin, Pencil, Trash2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ThreadCaps } from "@/stores/useSidebarStore";
import { useSidebarStore } from "@/stores/useSidebarStore";

type Props = {
  x: number;
  y: number;
  onClose(): void;
  caps?: ThreadCaps | null;
  onRename(): void;
  onTogglePin(): void;
  onDelete(): void;
  onBump?: () => void | Promise<void>;
  onOpenMove(): void;
  onMoveToProject?(projectId: string): void | Promise<void>;
  onMoveToGeneral?(): void | Promise<void>;
  onOpenProject?(): void;
  isProjectThread?: boolean;
  currentProjectId?: string | null;
};

export function ThreadContextMenu({
  x,
  y,
  onClose,
  onRename,
  onTogglePin,
  onDelete,
  isProjectThread = false,
  caps,
  onOpenMove,
  onMoveToProject,
  onMoveToGeneral,
  onOpenProject,
  currentProjectId = null,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number }>({
    left: x,
    top: y,
  });

  const [moveHover, setMoveHover] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const { projects } = useSidebarStore();

  useEffect(() => setMounted(true), []);

  // Clamp menu within viewport
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const PAD = 10;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));
    const nextLeft = clamp(x, PAD, vw - rect.width - PAD);
    const nextTop = clamp(y, PAD, vh - rect.height - PAD);

    setPos({ left: nextLeft, top: nextTop });
  }, [x, y]);

  useEffect(() => {
    const onPointerDownCapture = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      onClose();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("pointerdown", onPointerDownCapture, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDownCapture, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const openSubmenu = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMoveHover(true);
  };

  const closeSubmenuSoon = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setMoveHover(false);
      closeTimerRef.current = null;
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (!mounted) return null;

  const menu = (
    <div
      ref={ref}
      style={{ top: pos.top, left: pos.left }}
      className="
        fixed z-[1000] w-56
        rounded-2xl bg-[var(--surface-sidebar)] shadow-xl ring-1 ring-[var(--sb-line)]
        backdrop-blur-md
        text-sm overflow-visible text-[var(--sb-ink)]
      "
      onClick={(e) => e.stopPropagation()}
    >
      {caps?.canRename && (
        <MenuItem
          icon={<Pencil size={16} />}
          onClick={() => {
            onRename();
            onClose();
          }}
        >
          Rename
        </MenuItem>
      )}

      {caps?.canPin && (
        <MenuItem
          icon={<Pin size={16} />}
          onClick={() => {
            onTogglePin();
            onClose();
          }}
        >
          Pin / Unpin
        </MenuItem>
      )}

      {isProjectThread && onOpenProject && (
        <MenuItem
          icon={<FolderOpen size={16} />}
          onClick={() => {
            onOpenProject();
            onClose();
          }}
        >
          Open Project
        </MenuItem>
      )}

      {caps?.canMove && (
        <div
          className="relative"
          onMouseEnter={openSubmenu}
          onMouseLeave={closeSubmenuSoon}
        >
          <MenuItem icon={<ArrowRightLeft size={16} />} onClick={() => {}}>
            Move to Project &rarr;
          </MenuItem>

          {moveHover && (
            <div
              className="
                absolute left-full top-1 ml-1
                w-56 max-h-[320px] overflow-y-auto
                rounded-2xl bg-[var(--surface-sidebar)] shadow-xl
                ring-1 ring-[var(--sb-line)] backdrop-blur-md
                z-[1100]
              "
              onMouseEnter={openSubmenu}
              onMouseLeave={closeSubmenuSoon}
            >
              <SubMenuItem
                onClick={() => {
                  onOpenMove();
                  onClose();
                }}
              >
                + New Project
              </SubMenuItem>

              {currentProjectId && (
                <SubMenuItem
                  onClick={() => {
                    onMoveToGeneral?.();
                    onClose();
                  }}
                >
                  Move to General
                </SubMenuItem>
              )}

              {projects.map((p) => (
                <SubMenuItem
                  key={String(p.id)}
                  disabled={
                    String(currentProjectId ?? "") === String(p.id)
                  }
                  onClick={() => {
                    if (
                      String(currentProjectId ?? "") === String(p.id)
                    )
                      return;
                    onMoveToProject?.(String(p.id));
                    onClose();
                  }}
                >
                  {p.name}
                </SubMenuItem>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="my-1 border-t border-[var(--sb-line)]" />

      {caps?.canDelete && (
        <MenuItem
          danger
          icon={<Trash2 size={16} />}
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          Delete
        </MenuItem>
      )}
    </div>
  );

  return createPortal(menu, document.body);
}

function SubMenuItem({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick(): void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick();
      }}
      className="
        w-full text-left
        px-3 py-2
        text-sm
        hover:bg-[var(--sb-soft)]
        flex items-center
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
      "
    >
      {children}
    </button>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
  icon,
  disabled,
}: {
  children: React.ReactNode;
  onClick(): void;
  danger?: boolean;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick();
      }}
      className={`
        w-full flex items-center gap-2
        text-left px-3 py-2.5
        hover:bg-[var(--sb-soft)]
        ${danger ? "text-red-600 hover:bg-red-50/60" : "text-[var(--sb-ink)]"}
        ${disabled ? "opacity-40 cursor-not-allowed hover:bg-transparent" : ""}
      `}
    >
      <span className={danger ? "text-red-600" : "text-[var(--sb-ink-2)]"}>
        {icon}
      </span>
      <span className="font-medium">{children}</span>
    </button>
  );
}
