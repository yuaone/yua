import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";

import { useSidebar } from "@/components/layout/SidebarContext";
import { useMobileSidebarStore } from "@/store/useMobileSidebarStore";
import { useMobileChatStore } from "@/store/useMobileChatStore";
import { useMobileChatStream } from "@/hooks/useMobileChatStream";
import { useMobileChatSender } from "@/features/chat/hooks/useMobileChatSender";
import { createSidebarThread } from "@/lib/api/sidebar.api";
import ChatInput from "@/components/chat/ChatInput";
import MobilePlusPanel from "@/components/chat/input/MobilePlusPanel";
import { useTheme } from "@/hooks/useTheme";
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
  const { openSidebar } = useSidebar();

  const {
    activeProjectId,
    threads,
    setActiveContext,
    addThread,
  } = useMobileSidebarStore();

  const ensureThread = useMobileChatStore((s) => s.ensureThread);

  const { sendPrompt, isStreaming } = useMobileChatStream();
  const { send } = useMobileChatSender(sendPrompt);

  const [busy, setBusy] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);

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

  /* ---- Recent threads (filtered by project, max 5) ---- */
  const recent = threads
    .filter(
      (t) =>
        String(t.projectId ?? "null") ===
        String(activeProjectId ?? "null")
    )
    .slice(0, 5);

  /* ---- Handle thread tap ---- */
  const handleThreadTap = useCallback(
    (threadId: number, projectId: string | null) => {
      setActiveContext(projectId, threadId);
      router.push(`/(authed)/chat/${threadId}` as any);
    },
    [setActiveContext]
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

  return (
    <View style={[styles.container, { backgroundColor: tokens.surfaceMain }]}>
      {/* ---- Top Bar ---- */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 10,
            borderBottomColor: tokens.line,
          },
        ]}
      >
        <Pressable
          onPress={openSidebar}
          style={styles.hamburger}
          hitSlop={8}
        >
          <HamburgerIcon color={tokens.textPrimary} />
        </Pressable>
        <Text style={[styles.logoText, { color: tokens.textPrimary }]}>YUA</Text>
        {/* Right spacer for centering */}
        <View style={styles.hamburger} />
      </View>

      {/* ---- Scrollable Content ---- */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Text style={[styles.h1, { color: tokens.textPrimary }]}>
          무엇을 도와드릴까요?
        </Text>
        <Text style={[styles.subtitle, { color: tokens.textMuted }]}>
          질문, 분석, 문서 작성까지 — YUA가 함께합니다.
        </Text>

        {/* Recent Threads */}
        {recent.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={[styles.recentLabel, { color: tokens.textMuted }]}>
              최근 채팅
            </Text>
            <View style={styles.recentList}>
              {recent.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => handleThreadTap(t.id, t.projectId)}
                  style={({ pressed }) => [
                    styles.threadItem,
                    {
                      backgroundColor: pressed
                        ? tokens.wash
                        : tokens.threadBg,
                      borderColor: tokens.threadBorder,
                    },
                  ]}
                >
                  <Text
                    style={[styles.threadTitle, { color: tokens.textSecondary }]}
                    numberOfLines={1}
                  >
                    {t.title || "새 채팅"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Chat Input */}
        <View style={styles.inputSection}>
          <ChatInput
            streaming={isStreaming || busy}
            disabled={busy}
            onSend={handleSubmit}
            attachments={draftAttachments}
            onRemoveAttachment={(id) => {
              setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
            }}
            onPressAttachment={() => setPlusOpen(true)}
          />
        </View>
      </ScrollView>

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

      {/* ---- Footer Disclaimer ---- */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 8 },
        ]}
      >
        <Text style={[styles.disclaimer, { color: tokens.textMuted }]}>
          YUA는 실수할 수 있습니다. 중요한 정보는 반드시 확인하세요.
        </Text>
      </View>
    </View>
  );
}

/* ==============================
   Hamburger Icon (simple 3-line)
============================== */

function HamburgerIcon({ color }: { color: string }) {
  return (
    <View style={hamburgerStyles.wrapper}>
      <View style={[hamburgerStyles.bar, { backgroundColor: color }]} />
      <View style={[hamburgerStyles.bar, { backgroundColor: color }]} />
      <View style={[hamburgerStyles.bar, { backgroundColor: color }]} />
    </View>
  );
}

const hamburgerStyles = StyleSheet.create({
  wrapper: {
    width: 22,
    height: 16,
    justifyContent: "space-between",
  },
  bar: {
    width: 22,
    height: 2,
    borderRadius: 1,
  },
});

/* ==============================
   Styles
============================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Top Bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  hamburger: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  logoText: {
    fontSize: 17,
    fontWeight: "600",
  },

  /* Scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 32,
  },

  /* Hero */
  h1: {
    fontSize: 28,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },

  /* Recent */
  recentSection: {
    marginBottom: 24,
  },
  recentLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  recentList: {
    gap: 6,
  },
  threadItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  threadTitle: {
    fontSize: 15,
  },

  /* Input */
  inputSection: {
    marginTop: 8,
  },

  /* Footer */
  footer: {
    alignItems: "center",
    paddingTop: 8,
  },
  disclaimer: {
    fontSize: 11,
    textAlign: "center",
  },
});
