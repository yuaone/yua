import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";

import { useMobileSidebarStore } from "@/store/useMobileSidebarStore";
import { useMobileChatStore } from "@/store/useMobileChatStore";
import { useMobileChatStream } from "@/hooks/useMobileChatStream";
import { useMobileChatSender } from "@/features/chat/hooks/useMobileChatSender";
import { createSidebarThread } from "@/lib/api/sidebar.api";
import ChatInput from "@/components/chat/ChatInput";
import MobilePlusPanel from "@/components/chat/input/MobilePlusPanel";
import { QuickPromptBar } from "@/components/chat/QuickPromptBar";
import { useMobileAuth } from "@/contexts/MobileAuthContext";
import { useTheme } from "@/hooks/useTheme";
import { MobileTokens } from "@/constants/tokens";
import { useAdaptive } from "@/constants/adaptive";
import {
  uploadAttachments,
  type PendingAttachment,
} from "@/lib/api/upload.api";

/* ==============================
   Component
============================== */

export default function MobileChatOverview() {
  const { colors: tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { inputPad } = useAdaptive();
  const { profile } = useMobileAuth();

  const userName = profile?.user?.name?.trim() || null;

  const {
    activeProjectId,
    addThread,
  } = useMobileSidebarStore();

  const ensureThread = useMobileChatStore((s) => s.ensureThread);

  const { sendPrompt, isStreaming } = useMobileChatStream();
  const { send } = useMobileChatSender(sendPrompt);

  const [busy, setBusy] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [draftText, setDraftText] = useState("");

  const draftAttachments: AttachmentMeta[] = useMemo(
    () =>
      pendingAttachments.map((p) => ({
        id: p.id,
        fileName: p.fileName,
        mimeType: p.mimeType,
        kind: p.kind,
        fileUrl: p.uri,
        sizeBytes: p.sizeBytes,
        previewUrl: p.kind === "image" ? p.uri : undefined,
      })),
    [pendingAttachments]
  );

  /* ---- Handle first message submit ---- */
  const handleSubmit = useCallback(
    async (text: string) => {
      if (busy) return;
      setBusy(true);

      try {
        // 1) Create thread
        const threadId = await createSidebarThread(activeProjectId ?? null);
        if (!threadId) {
          console.error("[OVERVIEW] createThread failed");
          return;
        }

        // 2) Add to sidebar store
        const now = Date.now();
        addThread({
          id: threadId,
          title: "New Chat",
          createdAt: now,
          lastActiveAt: now,
          projectId: activeProjectId ?? null,
          pinned: false,
          pinnedOrder: null,
          caps: null,
        });

        // 3) Ensure thread in chat store
        ensureThread(threadId);

        // 4) Set active context
        useMobileSidebarStore.getState().setActiveContext(
          activeProjectId ?? null,
          threadId
        );

        // 5) Upload attachments if any
        let uploadedMetas: AttachmentMeta[] = [];
        if (pendingAttachments.length > 0) {
          try {
            uploadedMetas = await uploadAttachments(pendingAttachments);
          } catch (err) {
            console.warn("[OVERVIEW] Attachment upload failed", err);
            Alert.alert("업로드 실패", "파일 업로드에 실패했습니다.");
          }
          setPendingAttachments([]);
        }

        // 6) Send message via stream
        send({
          threadId,
          content: text,
          attachments: uploadedMetas,
        });

        // 7) Navigate to thread
        router.push(`/(authed)/chat/${threadId}` as any);
      } finally {
        setBusy(false);
      }
    },
    [busy, activeProjectId, addThread, ensureThread, send, pendingAttachments]
  );

  const safeBottom = insets.bottom || MobileTokens.space.md;

  return (
    <View style={[styles.container, { backgroundColor: tokens.surfaceMain }]}>
      {/* ---- Scrollable Hero Content (vertically centered) ---- */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: Logo circle + greeting */}
        <View style={styles.heroWrapper}>
          <View
            style={[
              styles.logoCircle,
              { backgroundColor: tokens.accent ?? tokens.textPrimary },
            ]}
          >
            <Text style={styles.logoCircleText}>Y</Text>
          </View>

          {userName ? (
            <Text style={[styles.h1, { color: tokens.textPrimary }]}>
              {userName}님, 안녕하세요!
            </Text>
          ) : null}
          <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
            무엇이든 물어보세요
          </Text>
        </View>

        {/* Quick prompt chips */}
        <QuickPromptBar onSelect={(draft) => setDraftText(draft)} />
      </ScrollView>

      {/* ---- Bottom-fixed Input ---- */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: safeBottom,
              paddingHorizontal: inputPad,
              borderTopColor: tokens.line,
            },
          ]}
        >
          <ChatInput
            streaming={isStreaming || busy}
            disabled={busy}
            onSend={handleSubmit}
            attachments={draftAttachments}
            onRemoveAttachment={(id) => {
              setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
            }}
            onPressAttachment={() => setPlusOpen(true)}
            draftText={draftText}
            onDraftConsumed={() => setDraftText("")}
          />
          <Text style={[styles.disclaimer, { color: tokens.textMuted }]}>
            YUA는 실수할 수 있습니다. 중요한 정보는 반드시 확인하세요.
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* Plus Panel */}
      <MobilePlusPanel
        visible={plusOpen}
        onClose={() => setPlusOpen(false)}
        onSelect={(action) => {
          setPlusOpen(false);
          if (action === "search" || action === "recent" || action === "photoLibrary") {
            Alert.alert("알림", "이 기능은 아직 준비 중입니다.");
          }
        }}
        onAttachmentsPicked={(picked) => {
          setPendingAttachments((prev) => [...prev, ...picked]);
        }}
      />
    </View>
  );
}

/* ==============================
   Styles
============================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: MobileTokens.space.lg,
  },

  /* Hero */
  heroWrapper: {
    alignItems: "center",
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: MobileTokens.space.lg,
  },
  logoCircleText: {
    fontSize: MobileTokens.font.xl,
    fontWeight: MobileTokens.weight.bold,
    color: "#ffffff",
  },
  h1: {
    fontSize: MobileTokens.font.xxl,
    fontWeight: MobileTokens.weight.semibold,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: MobileTokens.space.sm,
  },
  subtitle: {
    fontSize: MobileTokens.font.md,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: MobileTokens.space.xl,
  },

  /* Bottom Input Bar */
  inputBar: {
    paddingTop: MobileTokens.space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  /* Disclaimer */
  disclaimer: {
    fontSize: MobileTokens.font.xxs,
    textAlign: "center",
    marginTop: MobileTokens.space.xs,
  },
});
