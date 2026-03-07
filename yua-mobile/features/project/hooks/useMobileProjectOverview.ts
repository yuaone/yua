import { useMemo } from "react";

import { useMobileSidebarData } from "@/hooks/useMobileSidebarData";
import { sendChatPrompt } from "@/lib/api/chat.api";
import { useMobileSidebarStore } from "@/store/useMobileSidebarStore";

export function useMobileProjectOverview(projectId: string) {
  const { projects, threads } = useMobileSidebarStore();
  const { createNewThread } = useMobileSidebarData();

  const project = useMemo(
    () => projects.find((item) => String(item.id) === String(projectId)) ?? null,
    [projectId, projects]
  );

  const projectThreads = useMemo(
    () => threads.filter((item) => String(item.projectId ?? "") === String(projectId)),
    [projectId, threads]
  );

  const createThreadWithPrompt = async (prompt: string) => {
    const threadId = await createNewThread(projectId);
    if (!threadId) return null;

    const text = prompt.trim();
    if (text) {
      await sendChatPrompt({
        threadId,
        message: text,
        attachments: [],
        stream: true,
      });
    }

    return threadId;
  };

  return {
    project,
    projectThreads,
    createThreadWithPrompt,
  };
}
