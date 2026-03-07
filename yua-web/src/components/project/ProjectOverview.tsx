"use client";

import { useMemo, useRef } from "react";
import { Menu } from "lucide-react";
import { useSafePush } from "@/lib/router/safePush";
import { useSidebar } from "@/components/layout/SidebarContext";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useSidebarData } from "@/hooks/useSidebarData";
import { ThreadGroup } from "@/components/sidebar/ThreadGroup";
import ChatInput from "@/components/chat/ChatInput";
import { useChatStream } from "@/hooks/useChatStream";
import { useChatSender } from "@/hooks/useChatSender";
import { useChatStore } from "@/store/useChatStore";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

export function ProjectOverview({ projectId }: { projectId: string }) {
  const { openSidebar } = useSidebar();
  const push = useSafePush();
  const { createNewThread } = useSidebarData();
  const { projects, threads, setActiveContext } = useSidebarStore();
  const { sendPrompt } = useChatStream();
  const { send } = useChatSender(sendPrompt);
  const setActiveThread = useChatStore((s) => s.setActiveThread);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  usePullToRefresh(scrollRef);

  const project = useMemo(() => {
    return projects.find((p) => String(p.id) === String(projectId)) ?? null;
  }, [projects, projectId]);

  const list = useMemo(() => {
    return (threads ?? []).filter(
      (t) => String(t.projectId ?? "null") === String(projectId ?? "null")
    );
  }, [threads, projectId]);

  const title = project?.name ?? "Project";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--surface-main)] text-[var(--text-secondary)]">
      {/* Mobile Top Bar */}
      <div className="
        fixed top-0 left-0 right-0 z-40
        flex items-center gap-3 px-4
        pt-[calc(env(safe-area-inset-top)+10px)]
        pb-2
        h-[56px] max-lg:h-[52px]
        bg-[var(--surface-sidebar)] border-b border-[var(--line)]
        lg:hidden
      ">
        <button
          onClick={openSidebar}
          className="p-2 rounded-md hover:bg-white/10"
        >
          <Menu size={22} />
        </button>
        <span className="font-semibold text-[var(--text-primary)]">{title}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 sm:py-10 max-lg:pt-[60px]" style={{ overscrollBehavior: "contain" }}>
        <div className="w-full max-w-[880px] mx-auto">

          {/* Header */}
          <div className="mt-4 mb-8 sm:mt-6 sm:mb-10">
            <h1 className="text-[24px] sm:text-[30px] font-semibold tracking-tight text-[var(--text-primary)]">
              {title}
            </h1>
            <p className="mt-3 text-[14px] sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
              이 프로젝트의 모든 대화를 한 곳에서 관리하고 시작하세요.
            </p>
          </div>

          {/* Compose */}
          <div className="mb-10 mt-6 sm:mb-12 sm:mt-8 mx-auto w-full max-w-[var(--chat-input-max-w)]">
            <ChatInput
              threadId={null}
              onSubmit={async ({ content, attachments }) => {
                const threadId = await createNewThread(projectId);
                if (!threadId) return;

                setActiveThread(threadId);
                setActiveContext(projectId as any, threadId);

                send({
                  threadId,
                  content,
                  attachments,
                });

                push(`/chat/${threadId}`);
              }}
            />
          </div>

          {/* Threads */}
          {list.length === 0 ? (
            <div className="border-t border-[var(--line)] pt-8 sm:pt-10 text-center">
              <div className="text-[16px] sm:text-[18px] font-medium text-[var(--text-primary)]">
                아직 대화가 없습니다
              </div>
              <div className="mt-2 sm:mt-3 text-sm text-[var(--text-secondary)]">
                위 입력창에서 새로운 대화를 시작하세요.
              </div>
            </div>
          ) : (
            <div className="border-t border-[var(--line)]">
              <div className="divide-y">
                {list.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveContext(
                        (t.projectId ?? null) as any,
                        t.id
                      );
                      push(`/chat/${t.id}`);
                    }}
                    className="w-full text-left py-4 sm:py-5 hover:bg-white/10 transition"
                  >
                    <div className="text-[15px] sm:text-[16px] font-medium text-[var(--text-primary)] truncate">
                      {t.title || "새 채팅"}
                    </div>
                    <div className="mt-1 text-sm text-[var(--text-muted)]">
 {t.createdAt
   ? new Date(t.createdAt).toLocaleDateString()
   : ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
