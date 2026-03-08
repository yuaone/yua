import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { useAdaptive } from "@/constants/adaptive";
import { MobileTokens } from "@/constants/tokens";

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
  onRefresh?: () => Promise<void>;
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
  onRefresh,
}: MobileChatMessageListProps) {
  const listRef = useRef<FlatList<MobileChatMessage> | null>(null);
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { messageGap } = useAdaptive();
  const horizontalPad = width >= 768 ? 24 : 18; // --chat-pad-x: 18px
  const handledTargetRef = useRef<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const separatorComponent = useCallback(
    () => <View style={{ height: messageGap }} />,
    [messageGap],
  );

  const scrollBtnOpacity = useSharedValue(0);
  const scrollBtnVisible = useRef(false);
  const atBottomRef = useRef(true);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);

  const scrollBtnAnimStyle = useAnimatedStyle(() => ({
    opacity: scrollBtnOpacity.value,
    transform: [{ translateY: (1 - scrollBtnOpacity.value) * 8 }],
    pointerEvents: scrollBtnOpacity.value > 0.1 ? "auto" as const : "none" as const,
  }));

  /* ---------- Auto-scroll to bottom on new messages / streaming tokens ---------- */
  const lastContent = useMemo(
    () => messages[messages.length - 1]?.content ?? "",
    [messages],
  );

  const prevMsgCountRef = useRef(messages.length);

  useEffect(() => {
    if (!atBottomRef.current) return;
    // Use animated scroll only when a new message arrives (distinct count change)
    // During streaming token updates (same count, changed content), scroll instantly
    // to avoid queuing up many competing scroll animations
    const isNewMessage = messages.length !== prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;

    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: isNewMessage });
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
      const shouldShow = !isAtBottom;
      if (shouldShow !== scrollBtnVisible.current) {
        scrollBtnVisible.current = shouldShow;
        scrollBtnOpacity.value = withSpring(shouldShow ? 1 : 0, MobileTokens.spring.snappy);
      }
      contentHeightRef.current = contentSize.height;
      layoutHeightRef.current = layoutMeasurement.height;
    },
    [scrollBtnOpacity],
  );

  /* ---------- Scroll to bottom button ---------- */
  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
    atBottomRef.current = true;
    scrollBtnVisible.current = false;
    scrollBtnOpacity.value = withSpring(0, MobileTokens.spring.snappy);
  }, [scrollBtnOpacity]);

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
        ItemSeparatorComponent={separatorComponent}
        bounces
        overScrollMode="auto"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.linkColor}
              colors={[colors.linkColor]}
            />
          ) : undefined
        }
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
      <Animated.View style={[styles.scrollBtnWrap, scrollBtnAnimStyle]}>
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
            {"\u2193"} 아래로
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingTop: 12,
  },
  scrollBtnWrap: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
  },
  scrollBtn: {
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
