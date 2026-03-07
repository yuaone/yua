import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";

import AttachmentPreviewRow from "@/components/chat/AttachmentPreviewRow";
import { useMobileThinkingProfile } from "@/hooks/useMobileThinkingProfile";
import { useTheme } from "@/hooks/useTheme";

type InputMode = "ask" | "analyze" | "write" | "idea";

const MODE_META: Record<InputMode, { hint: string }> = {
  ask: { hint: "궁금한 걸 바로 물어보세요" },
  analyze: { hint: "내용을 붙여넣고 분석 요청" },
  write: { hint: "문서를 작성해보세요" },
  idea: { hint: "아이디어를 빠르게 정리" },
};

type ChatInputProps = {
  streaming: boolean;
  disabled?: boolean;
  onSend: (text: string) => Promise<void> | void;
  onStop?: () => void;
  onPressAttachment?: () => void;
  attachments?: AttachmentMeta[];
  onRemoveAttachment?: (id: string) => void;
};

export default function ChatInput({
  streaming,
  disabled = false,
  onSend,
  onStop,
  onPressAttachment,
  attachments = [],
  onRemoveAttachment,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [inputHeight, setInputHeight] = useState(52);
  const [focused, setFocused] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const horizontalPad = width >= 768 ? 18 : 12;
  const mode: InputMode = "ask";
  const { enabled, profile, disable } = useMobileThinkingProfile();

  const hasText = value.trim().length > 0;
  const hasAttachments = attachments.length > 0;
  const canSend = (hasText || hasAttachments) && !disabled && !streaming;
  const isTall = inputHeight > 72;
  const sendAtBottom = (attachments.length > 0 && !value.trim()) || isTall;

  const handleSend = async () => {
    const text = value.trim();
    if (!text && !hasAttachments) return;
    setValue("");
    setInputHeight(52);
    await onSend(text);
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

  const placeholder = MODE_META[mode].hint;

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.shell,
          {
            backgroundColor: colors.inputShellBg,
            borderColor: focused ? colors.inputShellFocusBorder : colors.inputShellBorder,
            paddingHorizontal: horizontalPad,
          },
        ]}
      >
        {enabled && profile === "DEEP" ? (
          <View style={styles.thinkChipRow}>
            <Pressable style={styles.thinkChip} onPress={disable}>
              <Text style={styles.thinkChipText}>DEEP ×</Text>
            </Pressable>
          </View>
        ) : null}
        {attachments.length > 0 ? (
          <View style={styles.attachmentsWrap}>
            <AttachmentPreviewRow attachments={attachments} onRemove={onRemoveAttachment} />
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <Pressable
            style={[styles.attachBtn, { backgroundColor: isDark ? colors.iconBtnBg : "#e2e8f0" }]}
            onPress={handlePressAttachment}
          >
            <Text style={[styles.attachText, { color: colors.inputText }]}>+</Text>
          </Pressable>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            multiline
            editable={!disabled && !streaming}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onContentSizeChange={(e) => {
              const next = Math.min(Math.max(52, e.nativeEvent.contentSize.height + 10), 200);
              setInputHeight(next);
            }}
            placeholderTextColor={colors.inputPlaceholder}
            style={[styles.input, { color: colors.inputText, height: inputHeight }]}
          />

          <View style={[styles.sendWrap, sendAtBottom ? styles.sendBottom : styles.sendCenter]}>
            {streaming ? (
              <Pressable style={styles.actionBtn} onPress={onStop}>
                <Text style={styles.actionText}>Stop</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.actionBtn, !canSend ? styles.actionBtnDisabled : null]}
                disabled={!canSend}
                onPress={handleSend}
              >
                <Text style={styles.actionText}>Send</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  shell: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingVertical: 10,
    gap: 10,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  shellDark: {
    backgroundColor: "#1e1e1e",
    borderColor: "rgba(255,255,255,0.08)",
  },
  shellFocused: {
    borderColor: "#0f172a",
  },
  shellFocusedDark: {
    borderColor: "rgba(255,255,255,0.3)",
  },
  thinkChipRow: {
    alignItems: "flex-start",
    paddingTop: 2,
  },
  thinkChip: {
    borderRadius: 999,
    backgroundColor: "#0f172a",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  thinkChipText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  attachmentsWrap: {
    paddingTop: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  attachBtnDark: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  attachText: {
    fontSize: 20,
    color: "#0f172a",
    lineHeight: 22,
  },
  attachTextDark: {
    color: "#f5f5f5",
  },
  input: {
    flex: 1,
    maxHeight: 200,
    minHeight: 52,
    fontSize: 15,
    color: "#0f172a",
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 8,
  },
  inputDark: {
    color: "#f5f5f5",
  },
  sendWrap: {
    position: "absolute",
    right: 0,
  },
  sendCenter: {
    top: "50%",
    marginTop: -16,
  },
  sendBottom: {
    bottom: 0,
  },
  actionBtn: {
    height: 36,
    width: 64,
    borderRadius: 18,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: {
    backgroundColor: "#94a3b8",
  },
  actionText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
});
