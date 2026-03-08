import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { MobileTokens } from "@/constants/tokens";

interface VoiceRecordingBarProps {
  duration: number;
  waveformData: number[];
  onCancel: () => void;
  onConfirm: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const BAR_COUNT = 40;
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const BAR_RADIUS = 1.5;
const BAR_MIN = 4;
const BAR_MAX = 24;

function VoiceRecordingBarInner({
  duration,
  waveformData,
  onCancel,
  onConfirm,
}: VoiceRecordingBarProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.voiceRecordBg,
        },
        MobileTokens.shadow.md,
      ]}
    >
      {/* Cancel button */}
      <TouchableOpacity
        onPress={onCancel}
        style={styles.cancelBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Text style={styles.cancelText}>{"\u00D7"}</Text>
      </TouchableOpacity>

      {/* Duration */}
      <Text style={[styles.duration, { color: colors.textPrimary }]}>
        {formatDuration(duration)}
      </Text>

      {/* Waveform */}
      <View style={styles.waveformContainer}>
        {Array.from({ length: BAR_COUNT }, (_, i) => {
          const amplitude = waveformData[i] ?? 0;
          const height = Math.max(
            BAR_MIN,
            Math.min(BAR_MAX, amplitude * BAR_MAX),
          );
          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height,
                  backgroundColor: colors.voiceWaveform,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Confirm button */}
      <TouchableOpacity
        onPress={onConfirm}
        style={styles.confirmBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Text style={styles.confirmText}>{"\u2713"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: MobileTokens.radius.input,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: MobileTokens.space.md,
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  duration: {
    fontSize: 15,
    fontFamily: "monospace",
    marginLeft: MobileTokens.space.sm,
    minWidth: 44,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: BAR_MAX,
    marginHorizontal: MobileTokens.space.sm,
  },
  bar: {
    width: BAR_WIDTH,
    marginHorizontal: BAR_GAP / 2,
    borderRadius: BAR_RADIUS,
  },
  confirmBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
});

export const VoiceRecordingBar = React.memo(VoiceRecordingBarInner);
