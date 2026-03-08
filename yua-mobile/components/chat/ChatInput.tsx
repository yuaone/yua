import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";

import AttachmentPreviewRow from "@/components/chat/AttachmentPreviewRow";
import { useAdaptive } from "@/constants/adaptive";
import { MobileTokens } from "@/constants/tokens";
import { useMobileThinkingProfile } from "@/hooks/useMobileThinkingProfile";
import { useTheme } from "@/hooks/useTheme";

// TODO: integrate useDraftStore for persistence

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ChatInputProps = {
  streaming: boolean;
  disabled?: boolean;
  onSend: (text: string) => Promise<void> | void;
  onStop?: () => void;
  onPressAttachment?: () => void;
  attachments?: AttachmentMeta[];
  onRemoveAttachment?: (id: string) => void;
  /** Pre-fill input text (e.g. from QuickPromptBar) */
  draftText?: string;
  /** Called after draftText is consumed */
  onDraftConsumed?: () => void;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const INPUT_MIN_HEIGHT = MobileTokens.layout.inputBarMinHeight; // 52
const INPUT_MAX_HEIGHT = MobileTokens.layout.inputBarMaxHeight; // 200
const BTN_SIZE = 32;
const STOP_ICON_SIZE = 10;
const LINE_LIMIT = 4000;
const LINE_WARN_THRESHOLD = 3800;

/** Count lines using charCodeAt — handles Korean IME correctly */
function countLines(text: string): number {
  let count = 1;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) count++;
  }
  return count;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ChatInput({
  streaming,
  disabled = false,
  onSend,
  onStop,
  onPressAttachment,
  attachments = [],
  onRemoveAttachment,
  draftText,
  onDraftConsumed,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT);
  const [focused, setFocused] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { colors, isDark } = useTheme();
  const { inputPad } = useAdaptive();
  const { enabled, profile, disable } = useMobileThinkingProfile();

  const lineCount = countLines(value);
  const overLimit = lineCount > LINE_LIMIT;
  const showLineWarning = lineCount > LINE_WARN_THRESHOLD;

  const hasText = value.trim().length > 0;
  const hasAttachments = attachments.length > 0;
  const canSend = (hasText || hasAttachments) && !disabled && !streaming && !overLimit;
  const showSend = hasText || hasAttachments || streaming;

  /* ---- handlers ---- */

  const handleSend = async () => {
    const text = value.trim();
    if (!text && !hasAttachments) return;
    setValue("");
    setInputHeight(INPUT_MIN_HEIGHT);
    await onSend(text);
  };

  const handleStop = () => {
    onStop?.();
  };

  const handlePressAttachment = () => {
    onPressAttachment?.();
  };

  useEffect(() => {
    const timer = hintTimerRef.current;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  /* ---- Consume draftText from parent ---- */
  useEffect(() => {
    if (draftText) {
      setValue(draftText);
      onDraftConsumed?.();
    }
  }, [draftText, onDraftConsumed]);

  /* ---- shadow (platform-specific) ---- */

  const shadowStyle = Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: focused ? 0.08 : 0.04,
      shadowRadius: focused ? 8 : 4,
    },
    android: {
      elevation: focused ? 6 : 3,
    },
  });

  /* ---- render ---- */

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.shell,
          {
            backgroundColor: colors.inputShellBg,
            borderColor: focused
              ? colors.inputShellFocusBorder
              : colors.inputShellBorder,
            paddingHorizontal: inputPad,
          },
          shadowStyle,
        ]}
      >
        {/* ---- DEEP chip (above input area) ---- */}
        {enabled && profile === "DEEP" ? (
          <View style={styles.chipRow}>
            <Pressable
              style={[
                styles.deepChip,
                { backgroundColor: colors.thinkDeepChipBg },
              ]}
              onPress={disable}
              accessibilityRole="button"
              accessibilityLabel="DEEP 모드 해제"
            >
              <Text
                style={[
                  styles.deepChipText,
                  { color: colors.thinkDeepChipColor },
                ]}
              >
                DEEP
              </Text>
              <Text
                style={[
                  styles.deepChipDismiss,
                  { color: colors.thinkDeepChipColor },
                ]}
              >
                {"\u00D7"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* ---- Attachment preview ---- */}
        {hasAttachments ? (
          <View style={styles.attachmentsWrap}>
            <AttachmentPreviewRow
              attachments={attachments}
              onRemove={onRemoveAttachment}
            />
          </View>
        ) : null}

        {/* ---- Input row: [+] TextInput [Send/Stop] ---- */}
        <View style={styles.inputRow}>
          {/* Plus button (left) */}
          <Pressable
            style={[
              styles.plusBtn,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "#f1f5f9",
              },
            ]}
            onPress={handlePressAttachment}
            accessibilityRole="button"
            accessibilityLabel="첨부파일 추가"
          >
            <Text style={[styles.plusIcon, { color: colors.inputText }]}>
              +
            </Text>
          </Pressable>

          {/* TextInput */}
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="메시지를 입력하세요..."
            multiline
            editable={!disabled && !streaming}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onContentSizeChange={(e) => {
              const h = e.nativeEvent.contentSize.height + 12;
              setInputHeight(
                Math.min(Math.max(INPUT_MIN_HEIGHT, h), INPUT_MAX_HEIGHT),
              );
            }}
            placeholderTextColor={colors.inputPlaceholder}
            style={[
              styles.input,
              {
                color: colors.inputText,
                height: inputHeight,
                opacity: streaming ? 0.5 : 1,
              },
            ]}
          />

          {/* Right button area */}
          <View style={styles.rightBtnWrap}>
            {streaming ? (
              /* ---- Stop button (red square) ---- */
              <Pressable
                style={styles.stopBtn}
                onPress={handleStop}
                accessibilityRole="button"
                accessibilityLabel="생성 중지"
              >
                <View style={styles.stopIcon} />
              </Pressable>
            ) : showSend ? (
              /* ---- Send button (circle arrow) ---- */
              <Pressable
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: canSend
                      ? colors.buttonBg
                      : isDark
                        ? "rgba(255,255,255,0.15)"
                        : "#cbd5e1",
                  },
                ]}
                disabled={!canSend}
                onPress={handleSend}
                accessibilityRole="button"
                accessibilityLabel="메시지 전송"
              >
                {/* Up-arrow SVG-like using unicode */}
                <Text style={styles.sendArrow}>{"\u2191"}</Text>
              </Pressable>
            ) : (
              /* ---- Empty: no button when no text/attachments ---- */
              <View style={styles.rightSpacer} />
            )}
          </View>
        </View>

        {/* ---- Line limit warning ---- */}
        {showLineWarning ? (
          <Text
            style={[
              styles.lineWarning,
              { color: colors.statusFailed },
            ]}
          >
            {lineCount.toLocaleString()}줄 / {LINE_LIMIT.toLocaleString()}줄
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },

  /* ---- Floating card shell ---- */
  shell: {
    borderWidth: 1,
    borderRadius: MobileTokens.radius.input, // 24
    paddingVertical: MobileTokens.space.sm, // 8
    gap: MobileTokens.space.xs, // 4
  },

  /* ---- DEEP chip ---- */
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: MobileTokens.space.xxs, // 2
    paddingBottom: MobileTokens.space.xxs,
  },
  deepChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: MobileTokens.radius.sm, // 8
    paddingHorizontal: MobileTokens.space.sm, // 8
    height: 28,
    gap: MobileTokens.space.xs, // 4
  },
  deepChipText: {
    fontSize: MobileTokens.font.xs, // 11
    fontWeight: MobileTokens.weight.semibold,
    letterSpacing: 0.5,
  },
  deepChipDismiss: {
    fontSize: MobileTokens.font.sm, // 13
    fontWeight: MobileTokens.weight.medium,
    opacity: 0.7,
  },

  /* ---- Attachments ---- */
  attachmentsWrap: {
    paddingTop: MobileTokens.space.xs, // 4
  },

  /* ---- Input row ---- */
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: MobileTokens.space.sm, // 8
  },

  /* Plus button */
  plusBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: (INPUT_MIN_HEIGHT - BTN_SIZE) / 2, // vertically center with 1-line input
  },
  plusIcon: {
    fontSize: 20,
    fontWeight: MobileTokens.weight.medium,
    lineHeight: 22,
    marginTop: -1,
  },

  /* TextInput */
  input: {
    flex: 1,
    minHeight: INPUT_MIN_HEIGHT,
    maxHeight: INPUT_MAX_HEIGHT,
    fontSize: MobileTokens.font.md, // 15
    paddingHorizontal: MobileTokens.space.xs, // 4
    paddingTop: Platform.select({ ios: 14, android: 10 }),
    paddingBottom: Platform.select({ ios: 14, android: 10 }),
    textAlignVertical: "center",
  },

  /* Right button wrapper */
  rightBtnWrap: {
    justifyContent: "flex-end",
    marginBottom: (INPUT_MIN_HEIGHT - BTN_SIZE) / 2,
  },

  /* Send button */
  sendBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  sendArrow: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: MobileTokens.weight.bold,
    lineHeight: 18,
    marginTop: -1,
  },

  /* Stop button */
  stopBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },
  stopIcon: {
    width: STOP_ICON_SIZE,
    height: STOP_ICON_SIZE,
    borderRadius: 2,
    backgroundColor: "#ffffff",
  },

  /* Spacer when no button shown */
  rightSpacer: {
    width: BTN_SIZE,
    height: BTN_SIZE,
  },

  /* Line limit warning */
  lineWarning: {
    fontSize: MobileTokens.font.xs, // 11
    textAlign: "right",
    paddingRight: MobileTokens.space.xs,
    paddingBottom: MobileTokens.space.xxs,
  },
});
