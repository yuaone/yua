import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

import MobileAssistantMessage from "@/components/chat/MobileAssistantMessage";
import MobileUserMessage from "@/components/chat/MobileUserMessage";
import MessageActions from "@/components/chat/MessageActions";
import type { MobileChatMessage } from "@/features/chat/model/chat-message.types";

type MobileChatMessageItemProps = {
  message: MobileChatMessage;
  onPressThink?: (message: MobileChatMessage) => void;
  onRegenerate?: (messageId: string) => void;
  highlighted?: boolean;
};

function MobileChatMessageItem({
  message,
  onPressThink,
  onRegenerate,
  highlighted = false,
}: MobileChatMessageItemProps) {
  const { colors } = useTheme();

  /* =========================
     Assistant Message
  ========================= */
  if (message.role === "assistant") {
    return (
      <View style={[styles.assistantRow, highlighted && styles.highlight]}>
        <View style={styles.assistantContent}>
          <MobileAssistantMessage message={message} onPressThink={onPressThink} />
          <View style={styles.actionsWrap}>
            {message.finalized && !message.streaming ? (
              <MessageActions
                messageId={message.id}
                content={message.content}
                disabled={false}
                threadId={message.threadId}
                traceId={message.traceId}
                onRegenerate={onRegenerate}
              />
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  /* =========================
     System Message
  ========================= */
  if (message.role === "system") {
    return (
      <View style={[styles.systemRow, highlighted && styles.highlight]}>
        <View
          style={[
            styles.systemBubble,
            { borderColor: colors.systemBubbleBorder, backgroundColor: colors.systemBubbleBg },
          ]}
        >
          <Text
            style={[
              styles.systemText,
              { color: colors.systemBubbleText },
            ]}
          >
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  /* =========================
     User Message
  ========================= */
  return (
    <View style={[highlighted && styles.highlight]}>
      <MobileUserMessage message={message} />
    </View>
  );
}

function areEqual(
  prev: MobileChatMessageItemProps,
  next: MobileChatMessageItemProps,
) {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.streaming === next.message.streaming &&
    prev.message.finalized === next.message.finalized &&
    prev.message._finalizedAt === next.message._finalizedAt &&
    prev.message.meta === next.message.meta &&
    prev.message.attachments === next.message.attachments &&
    prev.highlighted === next.highlighted
  );
}

export default memo(MobileChatMessageItem, areEqual);

const styles = StyleSheet.create({
  /* Assistant: left-aligned, full width, mt-1 mb-3 equivalent */
  assistantRow: {
    marginTop: 4,
    marginBottom: 12,
  },
  assistantContent: {
    width: "100%",
  },
  actionsWrap: {
    marginTop: 8,
    paddingLeft: 4,
    minHeight: 32,
  },
  /* System */
  systemRow: {
    alignItems: "flex-start",
    marginVertical: 4,
  },
  systemBubble: {
    maxWidth: "92%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  systemBubbleLight: {
    borderColor: "#cbd5e1",
    backgroundColor: "#eef2ff",
  },
  systemBubbleDark: {
    borderColor: "rgba(99,102,241,0.3)",
    backgroundColor: "rgba(99,102,241,0.08)",
  },
  systemText: {
    fontSize: 13,
  },
  systemTextLight: {
    color: "#334155",
  },
  systemTextDark: {
    color: "#d1d5db",
  },
  /* Highlight */
  highlight: {
    borderColor: "#f59e0b",
    borderWidth: 1,
    backgroundColor: "#fffbeb",
    borderRadius: 14,
    padding: 6,
  },
});
