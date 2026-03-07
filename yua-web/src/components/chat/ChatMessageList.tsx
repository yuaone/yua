"use client";
import { useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/store/useChatStore";
import type { ChatMessageWithMeta } from "@/store/useChatStore";
import ChatMessage from "./ChatMessage";
import GuestIntroMessage from "./GuestIntroMessage";
import { useStreamSessionStore } from "@/store/useStreamSessionStore";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";

type Props = {
  messages: ChatMessageWithMeta[];
};

export default function ChatMessageList({ messages }: Props) {
  const { status } = useAuth();

  const prevLengthRef = useRef(messages.length);
  const didRestoreProfileRef = useRef(false);
  const firstIdRef = useRef<string | null>(messages?.[0]?.id ?? null);
  // ✅ thread/message-set 변경 감지 → restore 1회 플래그 리셋
  useEffect(() => {
    const firstId = messages?.[0]?.id ?? null;
    if (firstIdRef.current !== firstId) {
      firstIdRef.current = firstId;
      didRestoreProfileRef.current = false;
    }
  }, [messages]);
  // ✅ SSOT: snapshot/meta race로 AssistantMessage에서 meta가 비어도,
  // ChatMessageList가 "마지막 assistant meta"를 보고 session.thinkingProfile을 1회 복원한다.
  const lastAssistantProfileFromMessages = useMemo(() => {
    if (!messages?.length) return null;
    const reversed = [...messages].reverse();
    const lastAssistant = reversed.find((m: any) => m?.role === "assistant");
    if (!lastAssistant) return null;
    const meta = (lastAssistant as any)?.meta as any;
    const p =
      (meta?.thinking?.thinkingProfile ??
        meta?.thinkingProfile ??
        meta?.profile ??
        null) as ThinkingProfile | null;
    return p === "FAST" || p === "NORMAL" || p === "DEEP" ? p : null;
  }, [messages]);
  useEffect(() => {
    const prev = prevLengthRef.current;
    const next = messages.length;

    // 🔒 SSOT:
    // length가 증가했을 때만 settle 이벤트 발생
    // 스트림 patch / meta patch로 인한 재렌더에는 반응 금지
    if (next > prev && !messages[next - 1]?.streaming) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event("chat:content:settled"));
        });
      });
    }

    prevLengthRef.current = next;
  }, [messages.length]);
  /* =========================================================
     🔥 SSOT: Restore thinkingProfile for drawer-gate
     - 조건:
       1) messages에서 last assistant profile을 찾을 수 있음
       2) 현재 session이 active streaming 중이 아님(라이브 세션 덮어쓰기 금지)
       3) session.thinkingProfile이 비어있거나, thread 진입 직후라 1회 보정 필요
     - 1회만 수행 (didRestoreProfileRef)
  ========================================================= */
  useEffect(() => {
    const profile = lastAssistantProfileFromMessages;
    if (!profile) return;

    const store = useStreamSessionStore.getState();
    const s = store.session;

    // 라이브 스트림/활성 세션이면 절대 건드리지 않음
    if (s.active === true || s.streaming === true) return;

    // 이미 복원했으면 스킵 (불필요한 setState 방지)
    if (didRestoreProfileRef.current) return;

    // 이미 값이 있으면 굳이 덮지 않음 (단, null/undefined면 복원)
    if (s.thinkingProfile === profile) {
      didRestoreProfileRef.current = true;
      return;
    }
    if (s.thinkingProfile != null) {
      // session에 이미 profile이 있으면 (snapshot 성공 등) 우선
      didRestoreProfileRef.current = true;
      return;
    }

    // ✅ 1회 복원
    useStreamSessionStore.setState({
      session: {
        ...s,
        thinkingProfile: profile,
      },
    });
    didRestoreProfileRef.current = true;
  }, [lastAssistantProfileFromMessages]);

  return (
    <div className="pb-2 md:pb-3">
      {/* Guest intro */}
      {status === "guest" && messages.length === 0 && (
        <GuestIntroMessage />
      )}

      {/* Chat messages */}
      <div className="flex flex-col gap-2">
        {messages.map((m, idx) => {


          return (
            <div
              key={m.id}
              data-message-id={m.id}
              data-created-at={m.createdAt}
              className="relative"
            >
           
              <ChatMessage
                id={m.id}
                role={m.role}
                content={m.content}
                attachments={m.attachments}
                streaming={m.streaming}
                finalized={m.finalized}
                _finalizedAt={m._finalizedAt}
                meta={m.meta}
                threadId={m.threadId}
                traceId={m.traceId}
                createdAt={m.createdAt}
              />
            </div>
          );
        })}

        {/* bottom sentinel (image / late height growth safe) */}
        <div
          aria-hidden
          className="h-[12px]"
          style={{ pointerEvents: "none" }}
        />
      </div>
    </div>
  );
}
