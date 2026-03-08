/**
 * AudioBubble — square card for audio attachments in chat messages.
 *
 * Displays a play/pause button, 32-bar deterministic waveform,
 * and elapsed/total time. Parent controls playback via props.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAdaptive } from "@/constants/adaptive";
import { MobileTokens } from "@/constants/tokens";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

/* ─── Props ─────────────────────────────────────────── */

interface AudioBubbleProps {
  audioUrl: string;
  durationMs: number;
  currentMs?: number;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  seed?: number;
}

/* ─── Constants ─────────────────────────────────────── */

const BAR_COUNT = 32;
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const BAR_RADIUS = 1.5;
const BAR_MIN = 6;
const BAR_MAX = 28;

/* ─── Helpers ───────────────────────────────────────── */

/** Deterministic pseudo-random height per bar based on seed. */
function barHeight(seed: number, index: number): number {
  const hash = ((seed * (index + 1) * 9301 + 49297) % 233280) / 233280;
  return BAR_MIN + hash * (BAR_MAX - BAR_MIN);
}

/** Format milliseconds as "m:ss". */
function fmtTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ─── Component ─────────────────────────────────────── */

function AudioBubbleInner({
  durationMs,
  currentMs = 0,
  isPlaying = false,
  onPlayPause,
  seed = 42,
}: AudioBubbleProps) {
  const { colors } = useTheme();
  const { pick } = useAdaptive();

  const size = pick({ phone: 160, tablet: 200 });
  const progress = durationMs > 0 ? currentMs / durationMs : 0;
  const playedBars = Math.floor(progress * BAR_COUNT);

  const waveformWidth = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor: colors.voiceWaveform + "1A", // 0.1 opacity hex
          borderRadius: MobileTokens.radius.card,
        },
      ]}
    >
      {/* Play / Pause button */}
      <Pressable
        onPress={onPlayPause}
        style={({ pressed }) => [
          styles.playBtn,
          { backgroundColor: colors.voiceWaveform, opacity: pressed ? 0.8 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause" : "Play"}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={20}
          color="#ffffff"
          style={isPlaying ? undefined : styles.playIcon}
        />
      </Pressable>

      {/* Waveform bars */}
      <View style={[styles.waveRow, { width: waveformWidth }]}>
        {Array.from({ length: BAR_COUNT }, (_, i) => {
          const h = barHeight(seed, i);
          const played = i < playedBars;
          return (
            <View
              key={i}
              style={{
                width: BAR_WIDTH,
                height: h,
                borderRadius: BAR_RADIUS,
                backgroundColor: colors.voiceWaveform,
                opacity: played ? 1 : 0.3,
                marginLeft: i > 0 ? BAR_GAP : 0,
              }}
            />
          );
        })}
      </View>

      {/* Time display */}
      <Text
        style={[
          styles.time,
          {
            color: colors.textMuted,
            fontFamily: Fonts?.mono ?? "monospace",
          },
        ]}
      >
        {fmtTime(currentMs)} / {fmtTime(durationMs)}
      </Text>
    </View>
  );
}

export const AudioBubble = React.memo(AudioBubbleInner);

/* ─── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    marginLeft: 2, // optical centering for play triangle
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontSize: 11,
  },
});
