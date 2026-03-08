import { useEffect, useRef, useMemo, memo } from "react";
import { useAuth } from "@/contexts/DesktopAuthContext";
import { useChatStore } from "@/stores/useChatStore";
import type { ChatMessageWithMeta } from "@/stores/useChatStore";
import ChatMessage from "./ChatMessage";
import GuestIntroMessage from "./GuestIntroMessage";
import { useStreamSessionStore } from "@/stores/useStreamSessionStore";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";

type Props = {
  messages: ChatMessageWithMeta[];
};

// Stable style objects — prevent new object allocation per render per message
const MESSAGE_WRAPPER_STYLE = {} as const;
const SENTINEL_STYLE = { pointerEvents: "none" } as const;

function ChatMessageList({ messages }: Props) {
  const { status } = useAuth();

  const prevLengthRef = useRef(messages.length);
  const didRestoreProfileRef = useRef(false);
  const firstIdRef = useRef<string | null>(messages?.[0]?.id ?? null);

  // thread/message-set change detection -> restore flag reset
  useEffect(() => {
    const firstId = messages?.[0]?.id ?? null;
    if (firstIdRef.current !== firstId) {
      firstIdRef.current = firstId;
      didRestoreProfileRef.current = false;
    }
  }, [messages]);

  // SSOT: restore session.thinkingProfile from last assistant meta (1x)
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

    // SSOT: only emit settle event when length increases (not on stream patch re-render)
    if (next > prev && !messages[next - 1]?.streaming) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event("chat:content:settled"));
        });
      });
    }

    prevLengthRef.current = next;
  }, [messages.length]);

  // SSOT: Restore thinkingProfile for drawer-gate (1x)
  useEffect(() => {
    const profile = lastAssistantProfileFromMessages;
    if (!profile) return;

    const store = useStreamSessionStore.getState();
    const s = store.session;

    // Never touch during live stream/active session
    if (s.active === true || s.streaming === true) return;

    // Already restored -> skip
    if (didRestoreProfileRef.current) return;

    // Already has the same value
    if (s.thinkingProfile === profile) {
      didRestoreProfileRef.current = true;
      return;
    }
    if (s.thinkingProfile != null) {
      didRestoreProfileRef.current = true;
      return;
    }

    // 1x restore
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
        {messages.map((m) => (
          <div
            key={m.id}
            data-message-id={m.id}
            data-created-at={m.createdAt}
            className="relative"
            style={MESSAGE_WRAPPER_STYLE}
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
        ))}

        {/* bottom sentinel (image / late height growth safe) */}
        <div
          aria-hidden
          className="h-[12px]"
          style={SENTINEL_STYLE}
        />
      </div>
    </div>
  );
}

export default memo(ChatMessageList);
