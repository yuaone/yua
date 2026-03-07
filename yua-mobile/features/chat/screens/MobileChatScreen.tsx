import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";

import ChatInput from "@/components/chat/ChatInput";
import MobileChatMessageList from "@/components/chat/MobileChatMessageList";
import MobileDeepThinkingDrawer from "@/components/chat/MobileDeepThinkingDrawer";
import MobilePlusPanel from "@/components/chat/input/MobilePlusPanel";
import {
  uploadAttachments,
  type PendingAttachment,
} from "@/lib/api/upload.api";
import MobileTopBar from "@/components/layout/MobileTopBar";
import MobileTopPanelHost from "@/components/layout/MobileTopPanelHost";
import { useSidebar } from "@/components/layout/SidebarContext";
import { useMobileAuth } from "@/contexts/MobileAuthContext";
import { useMobileChatController } from "@/features/chat/hooks/useMobileChatController";
import { useKeyboardDock } from "@/hooks/useKeyboardDock";
import { useMobileSidebarData } from "@/hooks/useMobileSidebarData";
import { useTopPanel } from "@/hooks/useTopPanel";
import { fetchChatMessages } from "@/lib/api/chat.api";
import { fetchPhotoLibraryAssets } from "@/lib/api/photo-library.api";
import { resetBadgeCount, setLastSeenForThread } from "@/lib/notifications/notificationGuards";
import { setAppBadgeCount } from "@/lib/notifications/mobileNotifications";
import type { MobilePhotoAsset } from "@/types/assets";
import { useMobileSidebarStore, useVisibleThreads } from "@/store/useMobileSidebarStore";
import { useMobileChatStore } from "@/store/useMobileChatStore";
import { useTheme } from "@/hooks/useTheme";

function resolveThreadId(raw: string | string[] | undefined): number | null {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function MobileChatScreen() {
  const { state, signOutUser } = useMobileAuth();
  const { toggleSidebar } = useSidebar();
  const { colors } = useTheme();
  const { threadId: routeThreadParam, messageId: routeMessageParam } = useLocalSearchParams<{
    threadId?: string;
    messageId?: string;
  }>();
  const routeThreadId = resolveThreadId(routeThreadParam);
  const routeMessageId = Array.isArray(routeMessageParam) ? routeMessageParam[0] : routeMessageParam;

  const { activePanel, visible, close, open, toggle } = useTopPanel();
  const { dockBottom, safeBottom } = useKeyboardDock();
  const { width } = useWindowDimensions();
  const dockInset = width >= 768 ? 24 : 10;
  const [plusOpen, setPlusOpen] = useState(false);
  const [photoAssets, setPhotoAssets] = useState<MobilePhotoAsset[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const routeRetryRef = useRef(0);
  const pendingFocusRef = useRef<string | null>(null);
  const focusRetryRef = useRef(0);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusLoadingRef = useRef(false);
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const {
    mode,
    setMode,
    projects,
    threads,
    activeProjectId,
    activeThreadId,
    loadingProjects,
    loadingThreads,
    setActiveContext,
    touchThread,
  } = useMobileSidebarStore();
  const visibleThreads = useVisibleThreads();
  const { loadProjects, loadThreads, createNewThread } = useMobileSidebarData();

  const selectedThreadId = routeThreadId ?? activeThreadId ?? null;

  const {
    messages,
    send,
    regenerate,
    retryLastSend,
    isStreaming,
    stopStream,
    streamState,
    streamSession,
    openThinkByMessage,
    closeThinkDrawer,
    activeThinkMessage,
  } = useMobileChatController(selectedThreadId);
  const { setMessages } = useMobileChatStore();

  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  // Convert PendingAttachment[] to AttachmentMeta[] for display in ChatInput
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

  const onPressSignOut = async () => {
    await signOutUser();
    router.replace("/auth");
  };

  const loadSidebar = useCallback(async () => {
    await Promise.all([loadProjects(), loadThreads()]);
  }, [loadProjects, loadThreads]);

  const loadPhotoAssets = useCallback(async () => {
    const assets = await fetchPhotoLibraryAssets({ scope: "user" });
    setPhotoAssets(assets);
  }, []);

  useEffect(() => {
    if (state === "guest" || state === "error") {
      router.replace("/auth");
      return;
    }
    if (state === "onboarding_required") {
      router.replace("/onboarding");
    }
  }, [state]);

  useEffect(() => {
    void loadSidebar();
  }, [loadSidebar]);

  const refreshingSidebar = loadingProjects || loadingThreads;
  const onRefreshSidebar = useCallback(async () => {
    await Promise.all([loadProjects(), loadThreads(true)]);
  }, [loadProjects, loadThreads]);

  useEffect(() => {
    if (activePanel !== "photoLibrary") return;
    void loadPhotoAssets();
  }, [activePanel, loadPhotoAssets]);

  useEffect(() => {
    if (routeThreadId == null) return;

    const thread = threads.find((item) => item.id === routeThreadId);
    if (!thread) return;

    setActiveContext(thread.projectId, thread.id);
    touchThread(thread.id);
  }, [routeThreadId, setActiveContext, threads, touchThread]);

  useEffect(() => {
    if (routeThreadId == null) return;
    if (loadingThreads) return;
    const thread = threads.find((item) => item.id === routeThreadId);
    if (thread) {
      routeRetryRef.current = 0;
      return;
    }

    if (routeRetryRef.current < 1) {
      routeRetryRef.current += 1;
      void loadThreads(true);
      return;
    }

    Alert.alert("Chat", "Unable to open that thread.");
    routeRetryRef.current = 0;
    setActiveContext(null, null);
    router.replace("/(authed)/chat" as any);
  }, [loadThreads, loadingThreads, routeThreadId, setActiveContext, threads]);

  useEffect(() => {
    if (!routeMessageId) return;
    if (selectedThreadId == null) return;
    pendingFocusRef.current = routeMessageId;
    focusRetryRef.current = 0;
  }, [routeMessageId, selectedThreadId]);

  useEffect(() => {
    const target = pendingFocusRef.current;
    if (!target) return;
    const exists = messages.some((message) => message.id === target);
    if (exists) {
      setScrollTargetId(target);
      return;
    }
    if (focusRetryRef.current < 2 && selectedThreadId != null && !focusLoadingRef.current) {
      focusRetryRef.current += 1;
      focusLoadingRef.current = true;
      void fetchChatMessages(selectedThreadId)
        .then((list) => {
          if (list && list.length) {
            setMessages(selectedThreadId, list);
          }
        })
        .finally(() => {
          focusLoadingRef.current = false;
        });
      return;
    }
    pendingFocusRef.current = null;
    setScrollTargetId(null);
    Alert.alert("Chat", "해당 메시지를 찾지 못해 최신 위치로 이동합니다.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (routeThreadId != null) return;
    setActiveContext(null, null);
  }, [routeThreadId, setActiveContext]);

  useEffect(() => {
    if (!pendingMessage) return;
    if (selectedThreadId == null) return;

    const prompt = pendingMessage;
    setPendingMessage(null);

    void send(prompt).catch(() => {
      Alert.alert("Send", "Failed to send the first message.");
    });
  }, [pendingMessage, selectedThreadId, send]);

  // NOTE: Deep thinking is now handled by MobileDeepThinkingDrawer (bottom sheet).
  // The activeThinkMessage.meta.drawerOpen flag controls the bottom sheet open state.

  useEffect(() => {
    if (streamState.kind === "ERROR") {
      setApiError("네트워크 또는 인증 문제로 요청에 실패했습니다.");
    }
  }, [streamState.kind]);

  useEffect(() => {
    if (activePanel != null) return;
    if (streamState.activity.length === 0) return;
    open("activity");
  }, [activePanel, open, streamState.activity.length]);

  useEffect(() => {
    if (visible && plusOpen) {
      setPlusOpen(false);
    }
  }, [plusOpen, visible]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onEnd(() => {
      // Sidebar swipe is now handled by MobileAppShell drawer
    });

  const onSelectThread = (threadId: number) => {
    const thread = threads.find((item) => item.id === threadId);
    touchThread(threadId);
    if (thread) {
      setActiveContext(thread.projectId, threadId);
    }
    close();
    router.replace(`/(authed)/chat/${threadId}` as any);
  };

  const onSelectProject = (projectId: string | null) => {
    if (projectId == null) {
      setActiveContext(null, null);
      setMode("threads");
      close();
      router.replace("/(authed)/chat" as any);
      return;
    }

    const exists = projects.some((project) => String(project.id) === String(projectId));
    if (!exists) {
      setActiveContext(null, null);
      setMode("threads");
      close();
      router.replace("/(authed)/chat" as any);
      return;
    }

    setActiveContext(projectId, null);
    close();
    router.push(`/(authed)/project/${projectId}` as any);
  };

  const onCreateThread = async () => {
    const threadId = await createNewThread(activeProjectId);
    if (!threadId) {
      Alert.alert("New chat", "Failed to create thread.");
      return;
    }

    close();
    router.replace(`/(authed)/chat/${threadId}` as any);
  };

  const onSend = async (text: string) => {
    // Upload pending attachments first
    let uploadedMetas: AttachmentMeta[] = [];
    if (pendingAttachments.length > 0) {
      try {
        uploadedMetas = await uploadAttachments(pendingAttachments);
      } catch (err) {
        console.warn("[SEND] Attachment upload failed", err);
        Alert.alert("업로드 실패", "파일 업로드에 실패했습니다. 다시 시도해주세요.");
        return;
      }
      setPendingAttachments([]);
    }

    if (selectedThreadId != null) {
      await send(text, uploadedMetas);
      return;
    }

    const threadId = await createNewThread(activeProjectId);
    if (!threadId) {
      Alert.alert("New chat", "Failed to create thread.");
      return;
    }

    setPendingMessage(text.trim());
    close();
    router.replace(`/(authed)/chat/${threadId}` as any);
  };

  const onPressThinkFromMessage = (message: (typeof messages)[number]) => {
    openThinkByMessage(message);
    // Bottom sheet opens automatically via activeThinkMessage.meta.drawerOpen
  };

  const onPressThink = () => {
    if (activeThinkMessage) {
      closeThinkDrawer();
      return;
    }
    // For non-DEEP messages, fallback to TopSlidePanel
    toggle("think");
  };

  const title = useMemo(() => {
    const current = threads.find((item) => item.id === selectedThreadId);
    return current?.title ?? "Chat";
  }, [selectedThreadId, threads]);

  const handleScrolledToMessage = useCallback((messageId: string) => {
    setHighlightId(messageId);
    pendingFocusRef.current = null;
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }
    focusTimerRef.current = setTimeout(() => {
      setHighlightId(null);
    }, 1600);
  }, []);

  const handleScrollFailed = useCallback((messageId: string) => {
    if (pendingFocusRef.current !== messageId) {
      pendingFocusRef.current = messageId;
    }
  }, []);

  useEffect(() => {
    if (AppState.currentState !== "active") return;
    if (selectedThreadId == null) return;
    if (messages.length === 0) return;

    const last = messages[messages.length - 1];
    if (!last) return;
    void setLastSeenForThread(selectedThreadId, last.id, last.createdAt);
    void resetBadgeCount().then(() => setAppBadgeCount(0));
  }, [messages, selectedThreadId]);

  return (
    <View style={[styles.root, { backgroundColor: colors.surfaceMain }]}>
      {/* Top Bar */}
      <MobileTopBar
        title={title}
        onPressMenu={toggleSidebar}
        onPressThink={onPressThink}
      />

      {/* Message List */}
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.contentWrap}>
          {apiError ? (
            <View style={[styles.errorCard, { borderColor: colors.errorBorder, backgroundColor: colors.errorBg }]}>
              <Text style={[styles.errorTitle, { color: colors.errorTitleColor }]}>{"\uC694\uCCAD \uC2E4\uD328"}</Text>
              <Text style={[styles.errorBody, { color: colors.errorBodyColor }]}>{apiError}</Text>
              <View style={styles.errorActions}>
                <Pressable
                  style={styles.errorBtn}
                  onPress={() => {
                    setApiError(null);
                    retryLastSend();
                  }}
                >
                  <Text style={styles.errorBtnText}>재시도</Text>
                </Pressable>
                <Pressable style={styles.errorGhost} onPress={() => setApiError(null)}>
                  <Text style={styles.errorGhostText}>닫기</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          <MobileChatMessageList
            messages={messages}
            bottomInset={106 + safeBottom + dockBottom}
            onPressThink={onPressThinkFromMessage}
            onRegenerate={regenerate}
            targetMessageId={scrollTargetId}
            highlightedMessageId={highlightId}
            onScrolledToMessage={handleScrolledToMessage}
            onScrollFailed={handleScrollFailed}
          />
        </View>
      </GestureDetector>

      {/* Input Dock */}
      <View
        style={[
          styles.inputDock,
          {
            bottom: dockBottom,
            paddingBottom: safeBottom + 8,
            left: dockInset,
            right: dockInset,
          },
        ]}
      >
        <ChatInput
          streaming={isStreaming}
          onSend={onSend}
          onStop={stopStream}
          attachments={draftAttachments}
          onRemoveAttachment={(id) => {
            setPendingAttachments((prev) => prev.filter((att) => att.id !== id));
          }}
          onPressAttachment={() => {
            close();
            setPlusOpen(true);
          }}
        />
        {isStreaming ? (
          <View style={styles.streamingHint}>
            <Text style={[styles.streamingHintText, { color: colors.streamingHintText }]}>
              YUA가 응답을 생성 중입니다…
            </Text>
          </View>
        ) : null}

        {/* Disclaimer */}
        <View style={styles.disclaimerWrap}>
          <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
            YUA는 실수할 수 있습니다. 중요한 정보는 반드시 확인하세요.
          </Text>
        </View>
      </View>

      {/* Overlays */}
      <MobileTopPanelHost
        activePanel={activePanel}
        visible={visible}
        onClose={() => {
          if (activePanel === "think") {
            closeThinkDrawer();
          }
          close();
        }}
        sidebarMode={mode}
        onSidebarModeChange={setMode}
        projects={projects}
        threads={visibleThreads}
        activeProjectId={activeProjectId}
        activeThreadId={activeThreadId}
        onSelectThread={onSelectThread}
        onSelectProject={onSelectProject}
        onCreateThread={onCreateThread}
        onOpenPhotoLibrary={() => open("photoLibrary")}
        onPressLogout={onPressSignOut}
        onRefreshSidebar={onRefreshSidebar}
        refreshingSidebar={refreshingSidebar}
        streamStateLabel={streamState.kind}
        tokenChars={streamState.text.length}
        traceId={streamSession.traceId ?? streamState.traceId}
        thinkingProfile={streamSession.thinkingProfile ?? streamState.thinkingProfile ?? null}
        streamStage={streamSession.stage ?? streamState.stage ?? null}
        activity={streamState.activity}
        sessionChunks={streamSession.chunks}
        sessionSummaries={streamSession.summaries}
        sessionLabel={streamSession.label}
        startedAt={streamSession.startedAt}
        finalizedAt={streamSession.finalizedAt}
        finalized={streamSession.finalized}
        photoAssets={photoAssets}
      />
      <MobilePlusPanel
        visible={plusOpen}
        onClose={() => setPlusOpen(false)}
        onSelect={(action) => {
          setPlusOpen(false);
          if (action === "photoLibrary") {
            open("photoLibrary");
            return;
          }
          if (action === "search" || action === "recent") {
            Alert.alert("Placeholder", "Not available yet.");
            return;
          }
        }}
        onAttachmentsPicked={(picked) => {
          setPendingAttachments((prev) => [...prev, ...picked]);
        }}
      />

      {/* Deep Thinking Bottom Sheet */}
      <MobileDeepThinkingDrawer
        open={activeThinkMessage?.meta?.drawerOpen === true}
        onClose={closeThinkDrawer}
        messageId={activeThinkMessage?.id ?? ""}
        traceId={activeThinkMessage?.traceId ?? streamSession.traceId ?? streamState.traceId ?? null}
        profileHint={
          (activeThinkMessage?.meta?.thinkingProfile ??
            activeThinkMessage?.meta?.thinking?.thinkingProfile ??
            streamSession.thinkingProfile ??
            null) as "FAST" | "NORMAL" | "DEEP" | null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootLight: {
    backgroundColor: "#ffffff", // --surface-main light
  },
  rootDark: {
    backgroundColor: "#111111", // --surface-main dark
  },
  contentWrap: {
    flex: 1,
  },
  inputDock: {
    position: "absolute",
    zIndex: 20,
  },
  streamingHint: {
    marginTop: 6,
    alignItems: "center",
  },
  streamingHintText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  streamingHintTextDark: {
    color: "#6b7280",
  },
  disclaimerWrap: {
    marginTop: 4,
    alignItems: "center",
    paddingBottom: 4,
  },
  disclaimerText: {
    fontSize: 11, // spec: 11px
    color: "#9ca3af", // --text-muted light
    textAlign: "center",
  },
  disclaimerTextDark: {
    color: "#6b7280", // --text-muted dark
  },
  errorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f5c2c2",
    backgroundColor: "#fff1f2",
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 10,
  },
  errorCardDark: {
    borderColor: "rgba(239,68,68,0.3)",
    backgroundColor: "rgba(239,68,68,0.1)",
  },
  errorTitle: { fontSize: 14, fontWeight: "700", color: "#991b1b" },
  errorTitleDark: { color: "#fca5a5" },
  errorBody: { fontSize: 12, color: "#7f1d1d", marginTop: 4 },
  errorBodyDark: { color: "#fca5a5" },
  errorActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  errorBtn: {
    backgroundColor: "#991b1b",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  errorBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  errorGhost: {
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  errorGhostText: { color: "#991b1b", fontSize: 12, fontWeight: "700" },
});
