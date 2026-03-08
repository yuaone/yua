/**
 * ChatSearchBar — Sticky in-chat message search bar.
 *
 * Slides in from top with Reanimated animation.
 * Debounced search input (300ms), prev/next navigation, match counter.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";

import { MobileTokens } from "@/constants/tokens";
import { useTheme } from "@/hooks/useTheme";

/* ─── Types ─── */

interface ChatSearchBarProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
  onPrev: () => void;
  onNext: () => void;
  currentMatch: number; // 1-based
  totalMatches: number;
}

/* ─── Constants ─── */

const DEBOUNCE_MS = 300;
const HIT_SLOP = { top: 4, right: 4, bottom: 4, left: 4 };

/* ─── Component ─── */

function ChatSearchBarInner({
  visible,
  onClose,
  onSearch,
  onPrev,
  onNext,
  currentMatch,
  totalMatches,
}: ChatSearchBarProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Clear state when hidden
  useEffect(() => {
    if (!visible) {
      setQuery("");
    }
  }, [visible]);

  // Debounced search
  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        onSearch(text);
      }, DEBOUNCE_MS);
    },
    [onSearch],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!visible) return null;

  const navDisabled = totalMatches === 0;
  const showCounter = totalMatches > 0 || query.length > 0;

  return (
    <Animated.View
      entering={SlideInUp.duration(200)}
      exiting={SlideOutUp.duration(150)}
      style={[
        styles.container,
        {
          backgroundColor: colors.searchBarBg,
          borderBottomColor: colors.searchBarBorder,
        },
      ]}
    >
      {/* Search icon */}
      <Text style={[styles.searchIcon, { color: colors.textMuted }]}>
        {"\u{1F50D}"}
      </Text>

      {/* Text input */}
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.textPrimary }]}
        placeholder={"검색어 입력..."}
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={handleChangeText}
        autoFocus
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Match counter */}
      {showCounter && (
        <Text style={[styles.counter, { color: colors.textMuted }]}>
          {totalMatches > 0 ? `${currentMatch}/${totalMatches}` : "0/0"}
        </Text>
      )}

      {/* Prev button */}
      <TouchableOpacity
        onPress={onPrev}
        disabled={navDisabled}
        hitSlop={HIT_SLOP}
        style={[styles.navButton, navDisabled && styles.navDisabled]}
        activeOpacity={0.6}
      >
        <Text style={[styles.navIcon, { color: colors.textMuted }]}>
          {"\u25B2"}
        </Text>
      </TouchableOpacity>

      {/* Next button */}
      <TouchableOpacity
        onPress={onNext}
        disabled={navDisabled}
        hitSlop={HIT_SLOP}
        style={[styles.navButton, navDisabled && styles.navDisabled]}
        activeOpacity={0.6}
      >
        <Text style={[styles.navIcon, { color: colors.textMuted }]}>
          {"\u25BC"}
        </Text>
      </TouchableOpacity>

      {/* Close button */}
      <TouchableOpacity
        onPress={onClose}
        hitSlop={HIT_SLOP}
        style={styles.closeButton}
        activeOpacity={0.6}
      >
        <Text style={[styles.closeIcon, { color: colors.textMuted }]}>
          {"\u00D7"}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export const ChatSearchBar = React.memo(ChatSearchBarInner);

/* ─── Styles ─── */

const styles = StyleSheet.create({
  container: {
    height: MobileTokens.layout.searchBarHeight,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: MobileTokens.font.md,
    paddingVertical: 0,
  },
  counter: {
    fontSize: MobileTokens.font.xs,
    marginHorizontal: 6,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  navDisabled: {
    opacity: 0.3,
  },
  navIcon: {
    fontSize: 14,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: 16,
  },
});
