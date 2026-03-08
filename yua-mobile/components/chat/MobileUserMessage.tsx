import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { useAdaptive } from "@/constants/adaptive";
import { MobileTokens } from "@/constants/tokens";

import MobileAttachmentDisplay from "@/components/chat/MobileAttachmentDisplay";
import type { MobileChatMessage } from "@/features/chat/model/chat-message.types";

type MobileUserMessageProps = {
  message: MobileChatMessage;
};

export default function MobileUserMessage({ message }: MobileUserMessageProps) {
  const { colors } = useTheme();
  const { userBubbleMaxWidth, width: screenWidth } = useAdaptive();

  const bubbleMaxWidth = Math.round(screenWidth * userBubbleMaxWidth);

  return (
    <View style={styles.wrap}>
      {message.attachments?.length ? (
        <View style={[styles.attachmentWrap, { maxWidth: bubbleMaxWidth }]}>
          <MobileAttachmentDisplay
            attachments={message.attachments}
            placement="user"
          />
        </View>
      ) : null}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.buttonBg,
            maxWidth: bubbleMaxWidth,
          },
        ]}
      >
        <Text style={[styles.text, { color: colors.buttonText }]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-end",
    marginBottom: 20,
    gap: 6,
  },
  attachmentWrap: {
    alignSelf: "flex-end",
  },
  bubble: {
    alignSelf: "flex-end",
    borderTopLeftRadius: MobileTokens.radius.bubble,
    borderTopRightRadius: MobileTokens.radius.bubbleCorner,
    borderBottomLeftRadius: MobileTokens.radius.bubble,
    borderBottomRightRadius: MobileTokens.radius.bubble,
    paddingHorizontal: MobileTokens.space.md,
    paddingVertical: 10,
  },
  text: {
    fontSize: MobileTokens.font.body,
    lineHeight: MobileTokens.font.body * MobileTokens.lineHeight.normal,
  },
});
