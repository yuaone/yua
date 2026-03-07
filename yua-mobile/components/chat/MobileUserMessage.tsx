import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

import MobileAttachmentDisplay from "@/components/chat/MobileAttachmentDisplay";
import type { MobileChatMessage } from "@/features/chat/model/chat-message.types";

type MobileUserMessageProps = {
  message: MobileChatMessage;
};

export default function MobileUserMessage({ message }: MobileUserMessageProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      {message.attachments?.length ? (
        <View style={styles.attachmentWrap}>
          <MobileAttachmentDisplay
            attachments={message.attachments}
            placement="user"
          />
        </View>
      ) : null}
      <View
        style={[
          styles.bubble,
          { backgroundColor: colors.userBubbleBg },
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: colors.userBubbleText },
          ]}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-end",
    marginBottom: 20, // mb-5
    gap: 6,
  },
  attachmentWrap: {
    alignSelf: "flex-end",
    maxWidth: "88%",
  },
  bubble: {
    maxWidth: "88%",
    borderRadius: 16, // rounded-2xl
    paddingHorizontal: 16, // px-4
    paddingVertical: 12, // py-3
  },
  bubbleLight: {
    backgroundColor: "rgba(0,0,0,0.04)", // var(--wash) light
  },
  bubbleDark: {
    backgroundColor: "rgba(255,255,255,0.06)", // var(--wash) dark, slightly more visible
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
  },
  textLight: {
    color: "#111111", // --text-primary light
  },
  textDark: {
    color: "#f5f5f5", // --text-primary dark
  },
});
