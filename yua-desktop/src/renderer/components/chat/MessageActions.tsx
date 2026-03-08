import { memo, useCallback, useState } from "react";
import { useChatStream } from "@/hooks/useChatStream";
import { useSuggestionFeedback } from "@/hooks/useSuggestionFeedback";
import { useChatStore } from "@/stores/useChatStore";
import { useAuth } from "@/contexts/DesktopAuthContext";

/* =========================
   Types
========================= */

type MessageActionsProps = {
  messageId: string;
  content: string;
  disabled?: boolean;
  threadId?: number;
  traceId?: string;
};

/* =========================
   Component
========================= */

function MessageActions({
  messageId,
  content,
  disabled = false,
  threadId,
  traceId,
}: MessageActionsProps) {
  const { regenerate } = useChatStream();
  const feedback = useSuggestionFeedback();
  const saved = useChatStore(
    (s) => s.feedbackByMessageId[messageId]
  );

  if (
    process.env.NODE_ENV !== "production" &&
    (!threadId || !traceId)
  ) {
    console.warn("[MessageActions][MISSING_IDS]", {
      messageId,
      threadId,
      traceId,
    });
  }

  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState<false | "loading" | "done">(false);

  /* Copy */
  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }, [content]);

  /* Share */
  const { authFetch } = useAuth();
  const handleShare = useCallback(async () => {
    if (shared === "loading" || disabled) return;
    setShared("loading");
    try {
      const res = await authFetch("/api/chat/share", {
        method: "POST",
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) throw new Error("share failed");
      const data = await res.json();
      const webBase = (import.meta.env.VITE_WEB_BASE_URL as string | undefined) ?? 'https://yuaone.com';
      const url = `${webBase}/share/${data.token}`;

      // Clipboard: try async API first, then fallback
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setShared("done");
      setTimeout(() => setShared(false), 1800);
    } catch {
      setShared(false);
    }
  }, [messageId, authFetch, shared, disabled]);

  /* Regenerate */
  const handleRegenerate = useCallback(() => {
    if (disabled) return;
    regenerate(messageId);
  }, [messageId, regenerate, disabled]);

  /* Feedback */
  const sendFeedback = useCallback(
    (action: "UP" | "DOWN") => {
      if (
        feedback.isLocked ||
        disabled ||
        saved ||
        !threadId ||
        !traceId
      )
        return;

      feedback.submit({
        threadId,
        traceId,
        suggestionId: messageId,
        action,
      });
    },
    [feedback, disabled, saved, threadId, traceId, messageId]
  );

  return (
    <div className="mt-4 flex items-center gap-3 select-none">
      {/* Thumbs Up */}
      <button
        type="button"
        onClick={() => sendFeedback("UP")}
        disabled={!!saved || disabled}
        className={`yua-action-btn ${saved === "UP" ? "is-active" : ""}`}
        aria-label="좋아요"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
      </button>

      {/* Thumbs Down */}
      <button
        type="button"
        onClick={() => sendFeedback("DOWN")}
        disabled={!!saved || disabled}
        className={`yua-action-btn ${saved === "DOWN" ? "is-active" : ""}`}
        aria-label="싫어요"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
          <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
        </svg>
      </button>

      {/* Copy */}
      <button
        type="button"
        onClick={handleCopy}
        disabled={!content}
        className={`yua-action-btn ${copied ? "is-active" : ""}`}
        aria-label="복사"
      >
        {copied ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>

      {/* Share Link */}
      <button
        type="button"
        onClick={handleShare}
        disabled={disabled || shared === "loading"}
        className={`yua-action-btn ${shared === "done" ? "is-active" : ""}`}
        aria-label="공유 링크 복사"
      >
        {shared === "done" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : shared === "loading" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
      </button>

      {/* Regenerate */}
      <button
        type="button"
        onClick={handleRegenerate}
        disabled={disabled}
        className="yua-action-btn"
        aria-label="다시 답변"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </button>
    </div>
  );
}

/* =========================
   Memo
========================= */

export default memo(MessageActions);
