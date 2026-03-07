import { useEffect, useMemo, useRef } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import MessageBubble from "@/components/chat/MessageBubble";
import type { MobileChatMessage } from "@/features/chat/model/chat-message.types";

type MessageListProps = {
  messages: MobileChatMessage[];
  bottomInset?: number;
};

export default function MessageList({
  messages,
  bottomInset = 120,
}: MessageListProps) {
  const listRef = useRef<FlatList<MobileChatMessage> | null>(null);

  const lastContent = useMemo(() => messages[messages.length - 1]?.content ?? "", [messages]);

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 16);
    return () => clearTimeout(timer);
  }, [messages.length, lastContent]);

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: bottomInset },
        ]}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
});
