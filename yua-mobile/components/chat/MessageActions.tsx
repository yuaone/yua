import { memo, useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";

import { useSuggestionFeedback } from "@/hooks/useSuggestionFeedback";
import { useMobileChatStore } from "@/store/useMobileChatStore";
import { useMobileAuth } from "@/contexts/MobileAuthContext";
import { useTheme } from "@/hooks/useTheme";

/* ------------------------------------------------------------------ */
/*  Unicode icon constants (cross-platform safe)                       */
/* ------------------------------------------------------------------ */
const ICON_THUMBS_UP = "\u{1F44D}";
const ICON_THUMBS_DOWN = "\u{1F44E}";
const ICON_COPY = "\u29C9"; // two overlapping squares
const ICON_CHECK = "\u2713"; // check mark
const ICON_REGENERATE = "\u21BB"; // clockwise arrow
const ICON_SHARE = "\u{1F517}"; // link emoji

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? "https://yuaone.com";

type MessageActionsProps = {
  messageId: string;
  content: string;
  disabled?: boolean;
  threadId?: number;
  traceId?: string;
  onRegenerate?: (messageId: string) => void;
};

function MessageActions({
  messageId,
  content,
  disabled = false,
  threadId,
  traceId,
  onRegenerate,
}: MessageActionsProps) {
  const { colors } = useTheme();
  const { authFetch } = useMobileAuth();
  const feedback = useSuggestionFeedback();
  const saved = useMobileChatStore((s) => s.feedbackByMessageId[messageId]);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState<false | "loading" | "done">(false);

  if (process.env.NODE_ENV !== "production" && (!threadId || !traceId)) {
    console.warn("[MessageActions][MISSING_IDS]", { messageId, threadId, traceId });
  }

  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      await Clipboard.setStringAsync(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }, [content]);

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
      const url = `${WEB_BASE_URL}/share/${data.token}`;
      await Clipboard.setStringAsync(url);
      setShared("done");
      setTimeout(() => setShared(false), 1800);
    } catch {
      setShared(false);
    }
  }, [messageId, authFetch, shared, disabled]);

  const handleRegenerate = useCallback(() => {
    if (disabled) return;
    onRegenerate?.(messageId);
  }, [disabled, messageId, onRegenerate]);

  const sendFeedback = useCallback(
    (action: "UP" | "DOWN") => {
      if (feedback.isLocked || disabled || saved || !threadId || !traceId) return;
      feedback.submit({
        threadId,
        traceId,
        suggestionId: messageId,
        action,
      });
    },
    [disabled, feedback, messageId, saved, threadId, traceId]
  );

  /* ---- dynamic styles ---- */
  const idleColor = colors.textMuted;
  const activeUpColor = colors.statusOk;
  const activeDownColor = colors.statusFailed;
  const disabledOpacity = disabled ? 0.4 : 1;

  return (
    <View style={styles.wrap}>
      {/* Thumbs Up */}
      <Pressable
        onPress={() => sendFeedback("UP")}
        disabled={!!saved || disabled}
        style={[
          styles.button,
          { opacity: disabledOpacity },
          saved === "UP" && { backgroundColor: colors.wash },
        ]}
        hitSlop={4}
      >
        <Text
          style={[
            styles.icon,
            { color: saved === "UP" ? activeUpColor : idleColor },
          ]}
        >
          {ICON_THUMBS_UP}
        </Text>
      </Pressable>

      {/* Thumbs Down */}
      <Pressable
        onPress={() => sendFeedback("DOWN")}
        disabled={!!saved || disabled}
        style={[
          styles.button,
          { opacity: disabledOpacity },
          saved === "DOWN" && { backgroundColor: colors.wash },
        ]}
        hitSlop={4}
      >
        <Text
          style={[
            styles.icon,
            { color: saved === "DOWN" ? activeDownColor : idleColor },
          ]}
        >
          {ICON_THUMBS_DOWN}
        </Text>
      </Pressable>

      {/* Copy / Check */}
      <Pressable
        onPress={handleCopy}
        disabled={!content}
        style={[
          styles.button,
          { opacity: !content ? 0.4 : 1 },
          copied && { backgroundColor: colors.wash },
        ]}
        hitSlop={4}
      >
        <Text
          style={[
            styles.icon,
            { color: copied ? activeUpColor : idleColor },
          ]}
        >
          {copied ? ICON_CHECK : ICON_COPY}
        </Text>
      </Pressable>

      {/* Share */}
      <Pressable
        onPress={handleShare}
        disabled={shared === "loading" || disabled}
        style={[
          styles.button,
          { opacity: shared === "loading" ? 0.4 : disabledOpacity },
          shared === "done" && { backgroundColor: colors.wash },
        ]}
        hitSlop={4}
      >
        <Text
          style={[
            styles.icon,
            { color: shared === "done" ? activeUpColor : idleColor },
          ]}
        >
          {shared === "done" ? ICON_CHECK : ICON_SHARE}
        </Text>
      </Pressable>

      {/* Regenerate */}
      <Pressable
        onPress={handleRegenerate}
        disabled={disabled}
        style={[styles.button, { opacity: disabledOpacity }]}
        hitSlop={4}
      >
        <Text style={[styles.icon, { color: idleColor }]}>
          {ICON_REGENERATE}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 16,
    lineHeight: 20,
    textAlign: "center",
  },
});

export default memo(MessageActions);
