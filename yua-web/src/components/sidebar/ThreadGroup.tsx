"use client";

import { useState } from "react";
import type { Project, Thread } from "@/store/useSidebarStore";
import { ThreadItem } from "./ThreadItem";
import { ThreadContextMenu } from "./ThreadContextMenu";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useSidebarData } from "@/hooks/useSidebarData";
import { useSafePush } from "@/lib/router/safePush";

export function ThreadGroup({
  label,
  threads,
}: {
  label: string;
  threads: Thread[];
}) {
  const push = useSafePush();
  const {
    setActiveThread,
    startEditingThread,
    updateThread,
    setActiveContext,
    projects,
    activeThreadId,
  } = useSidebarStore();
 const { renameThread, togglePin, deleteThread, moveThread, bumpThread } =
   useSidebarData();

  const [menu, setMenu] = useState<{
    thread: Thread;
    x: number;
    y: number;
  } | null>(null);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<Thread | null>(null);


  if (!threads.length) return null;

  return (
    <section className="mb-3 max-lg:mb-2">
      {label ? (
        <div className="mb-2 px-2 text-[13px] font-semibold tracking-[0.16em] text-[var(--sb-ink-2)] max-lg:text-[12px]">
          {label.toUpperCase()}
        </div>
      ) : null}

      <div className="space-y-1 px-1 max-lg:px-0 max-lg:space-y-0.5">
        {threads.map((t) => (
          <ThreadItem
            key={t.id}
            threadId={t.id}
            title={t.title}
            createdAt={t.createdAt}
            pinned={t.pinned}
            active={activeThreadId === t.id}
            onClick={() => {
              setActiveContext((t.projectId ?? null) as any, t.id);
              push(`/chat/${String(t.id)}`);
            }}
            onOpenMenu={(e) => {
              setMenu({
                thread: t,
                x: e.clientX,
                y: e.clientY,
              });
            }}
          />
        ))}
      </div>

{menu && (
    <ThreadContextMenu
      x={menu.x}
      y={menu.y}
      onClose={() => setMenu(null)}
      onRename={() =>
        startEditingThread(menu.thread.id)
      }
      onTogglePin={() =>
        togglePin(menu.thread.id)
      }
      onBump={() => bumpThread(menu.thread.id)}
      onDelete={() => {
        const before = useSidebarStore.getState();
        const deletingId = menu.thread.id;
        const wasActive =
          before.activeThreadId === deletingId;

        deleteThread(deletingId);

        // 🔒 inactive 삭제 → 라우팅 없음
        if (!wasActive) return;

        const after = useSidebarStore.getState();
        const remaining = after.threads ?? [];

        // ✅ SSOT: "현재 컨텍스트" 안에서 다음 thread 선택
        const pid = after.activeProjectId ?? null;
        const remainingInContext = remaining.filter(
          (t) => String(t.projectId ?? "null") === String(pid ?? "null")
        );
        const next = remainingInContext[0] ?? null;

        if (next) {
          after.setActiveContext((next.projectId ?? null) as any, next.id);
          push(`/chat/${next.id}`);
        } else if (pid != null) {
          push(`/project/${pid}`);
        } else {
          push(`/chat`);
        }
      }}
      caps={menu.thread.caps ?? null}
      isProjectThread={Boolean(menu.thread.projectId)}
       onOpenProject={() => {
            const pid = menu.thread.projectId;
            if (!pid) return;
            setActiveContext(String(pid) as any, null);
            push(`/project/${String(pid)}`);
          }}
          onOpenMove={() => {
            const t = menu.thread;
            if (!t.caps?.canMove) return;
            setMoveTarget(t);
            setMoveOpen(true);
          }}
          onMoveToProject={async (projectId) => {
            const t = menu.thread;
            if (!t.caps?.canMove) return;
            const ok = await moveThread(t.id, projectId);
            if (!ok) return;
            updateThread(t.id, { projectId: String(projectId) });
            setActiveContext(String(projectId) as any, null);
            push(`/project/${String(projectId)}`);
          }}
          onMoveToGeneral={async () => {
            const t = menu.thread;
            if (!t.caps?.canMove) return;
            const ok = await moveThread(t.id, null);
            if (!ok) return;
            updateThread(t.id, { projectId: null });
            setActiveContext(null as any, null);
            // 요청사항: 다시 뺄 때는 현재 overview 유지 (라우팅 변경 없음)
          }}
          currentProjectId={menu.thread.projectId ?? null}
    />
)}

{moveOpen && moveTarget && (
  <MoveModal
    projects={projects as Project[]}
    currentProjectId={moveTarget.projectId ?? null}
    onClose={() => {
      setMoveOpen(false);
      setMoveTarget(null);
    }}
    onSelect={async (pidOrNull) => {
      const ok = await moveThread(moveTarget.id, pidOrNull);
      if (!ok) return;

      // ✅ SSOT: 성공 시 즉시 store 반영
      updateThread(moveTarget.id, { projectId: pidOrNull ? String(pidOrNull) : null });
      setActiveContext(pidOrNull ? (String(pidOrNull) as any) : null, null);

      // ✅ A안: project overview로 이동
            setMoveOpen(false);
            setMoveTarget(null);
            if (pidOrNull) push(`/project/${String(pidOrNull)}`);
            else push(`/chat`);
    }}
  />
)}

    </section>
  );
}

function MoveModal({
  projects,
  currentProjectId,
  onClose,
  onSelect,
}: {
  projects: Project[];
  currentProjectId: string | null;
  onClose(): void;
  onSelect(projectId: Project["id"] | null): void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="w-[440px] rounded-2xl bg-[var(--surface-panel)] p-4 shadow-xl ring-1 ring-[var(--sb-line)] text-[var(--sb-ink)]">
        <div className="mb-1 text-sm font-semibold">프로젝트로 이동</div>
        <div className="mb-3 text-xs text-[var(--sb-ink-2)]">선택 즉시 이동합니다.</div>

        <div className="max-h-[320px] overflow-auto space-y-1 rounded-xl border border-[var(--sb-line)] bg-[var(--sb-soft)] p-2">
         <button
            className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-[var(--sb-soft)]"
            onClick={() => onSelect(null)}
          >
            General
          </button>
          {projects.map((p) => (
            <button
              key={String(p.id)}
              className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-[var(--sb-soft)]"
              onClick={() => onSelect(p.id)}
            >
              {p.name}
            </button>
          ))}
          {projects.length === 0 && (
            <div className="text-sm text-[var(--sb-ink-2)] px-3 py-2">
              아직 프로젝트가 없어. 먼저 생성해줘.
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold hover:bg-black/[0.03]"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
