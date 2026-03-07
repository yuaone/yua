"use client";

import { memo, useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";

import { useSuggestionFeedback } from "@/hooks/useSuggestionFeedback";
import { useMobileChatStore } from "@/store/useMobileChatStore";

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
  const feedback = useSuggestionFeedback();
  const saved = useMobileChatStore((s) => s.feedbackByMessageId[messageId]);
  const [copied, setCopied] = useState(false);

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

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => sendFeedback("UP")}
        disabled={!!saved || disabled}
        style={[styles.button, saved === "UP" ? styles.buttonActive : null]}
      >
        <Text style={styles.buttonText}>👍</Text>
      </Pressable>

      <Pressable
        onPress={() => sendFeedback("DOWN")}
        disabled={!!saved || disabled}
        style={[styles.button, saved === "DOWN" ? styles.buttonActive : null]}
      >
        <Text style={styles.buttonText}>👎</Text>
      </Pressable>

      <Pressable
        onPress={handleCopy}
        disabled={!content}
        style={[styles.button, copied ? styles.buttonActive : null]}
      >
        <Text style={styles.buttonText}>⧉</Text>
      </Pressable>

      <Pressable onPress={handleRegenerate} disabled={disabled} style={styles.button}>
        <Text style={styles.buttonText}>↻</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  button: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: "#e2e8f0",
  },
  buttonText: {
    fontSize: 16,
    color: "#64748b",
  },
});

export default memo(MessageActions);
