import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

import MobileChatMessageItem from "@/components/chat/MobileChatMessageItem";
import type { MobileChatMessage } from "@/features/chat/model/chat-message.types";

type MobileChatMessageListProps = {
  messages: MobileChatMessage[];
  bottomInset?: number;
  onPressThink?: (message: MobileChatMessage) => void;
  onRegenerate?: (messageId: string) => void;
  targetMessageId?: string | null;
  highlightedMessageId?: string | null;
  onScrolledToMessage?: (messageId: string) => void;
  onScrollFailed?: (messageId: string) => void;
};

const SCROLL_BOTTOM_THRESHOLD = 200;

export default function MobileChatMessageList({
  messages,
  bottomInset = 120,
  onPressThink,
  onRegenerate,
  targetMessageId = null,
  highlightedMessageId = null,
  onScrolledToMessage,
  onScrollFailed,
}: MobileChatMessageListProps) {
  const listRef = useRef<FlatList<MobileChatMessage> | null>(null);
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const horizontalPad = width >= 768 ? 24 : 18; // --chat-pad-x: 18px
  const handledTargetRef = useRef<string | null>(null);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const atBottomRef = useRef(true);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);

  /* ---------- Auto-scroll to bottom on new messages / streaming tokens ---------- */
  const lastContent = useMemo(
    () => messages[messages.length - 1]?.content ?? "",
    [messages],
  );

  useEffect(() => {
    if (!atBottomRef.current) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 16);
    return () => clearTimeout(timer);
  }, [messages.length, lastContent]);

  /* ---------- Scroll position tracking ---------- */
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - contentOffset.y - layoutMeasurement.height;
      const isAtBottom = distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD;
      atBottomRef.current = isAtBottom;
      setShowScrollBtn(!isAtBottom);
      contentHeightRef.current = contentSize.height;
      layoutHeightRef.current = layoutMeasurement.height;
    },
    [],
  );

  /* ---------- Scroll to bottom button ---------- */
  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
    atBottomRef.current = true;
    setShowScrollBtn(false);
  }, []);

  /* ---------- Target message scrolling ---------- */
  useEffect(() => {
    if (!targetMessageId) return;
    if (handledTargetRef.current === targetMessageId) return;
    const index = messages.findIndex(
      (message) => message.id === targetMessageId,
    );
    if (index < 0) {
      onScrollFailed?.(targetMessageId);
      return;
    }

    handledTargetRef.current = targetMessageId;
    try {
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.4,
      });
      const timer = setTimeout(() => {
        onScrolledToMessage?.(targetMessageId);
      }, 180);
      return () => clearTimeout(timer);
    } catch {
      onScrollFailed?.(targetMessageId);
    }
  }, [messages, onScrollFailed, onScrolledToMessage, targetMessageId]);

  /* ---------- Render ---------- */
  const renderItem = useCallback(
    ({ item }: { item: MobileChatMessage }) => (
      <MobileChatMessageItem
        message={item}
        onPressThink={onPressThink}
        onRegenerate={onRegenerate}
        highlighted={item.id === highlightedMessageId}
      />
    ),
    [onPressThink, onRegenerate, highlightedMessageId],
  );

  const keyExtractor = useCallback(
    (message: MobileChatMessage) => message.id,
    [],
  );

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: bottomInset,
            paddingHorizontal: horizontalPad,
          },
        ]}
        ItemSeparatorComponent={ItemSeparator}
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={7}
        initialNumToRender={15}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.4,
            });
          }, 250);
        }}
      />

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <Pressable
          style={[
            styles.scrollBtn,
            { backgroundColor: colors.scrollBtnBg },
          ]}
          onPress={scrollToBottom}
        >
          <Text
            style={[
              styles.scrollBtnText,
              { color: colors.scrollBtnText },
            ]}
          >
            {"\u2193"} \uC544\uB798\uB85C
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/* ---------- Separator (gap-2 = 8px) ---------- */
function ItemSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingTop: 12,
  },
  separator: {
    height: 8, // gap-2
  },
  scrollBtn: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  scrollBtnLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  scrollBtnDark: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  scrollBtnText: {
    fontSize: 13,
  },
  scrollBtnTextLight: {
    color: "#4b5563",
  },
  scrollBtnTextDark: {
    color: "#d1d5db",
  },
});
