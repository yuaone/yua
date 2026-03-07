import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect, Stack, router } from "expo-router";

import { useMobileAuth } from "@/contexts/MobileAuthContext";
import { useMobileLocalNotifications } from "@/hooks/useMobileLocalNotifications";
import { useMobileSidebarData } from "@/hooks/useMobileSidebarData";
import {
  addNotificationResponseListener,
  getInitialNotificationResponse,
} from "@/lib/notifications/mobileNotifications";

import MobileAppShell from "@/components/layout/MobileAppShell";
import MobileSettingsModal from "@/components/settings/MobileSettingsModal";
import { SidebarProvider } from "@/components/layout/SidebarContext";

/* ==============================
   AuthedLayout

   Wraps all authed screens with:
   1. Auth guard (redirect if not authed)
   2. Sidebar drawer (left swipe or hamburger)
   3. Notification routing
   4. Sidebar data loading on auth
============================== */

export default function AuthedLayout() {
  const { ready, state } = useMobileAuth();
  useMobileLocalNotifications();

  /* ---- Notification routing ---- */
  const pendingRouteRef = useRef<string | null>(null);
  const lastRoutedRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const routeFromData = (data?: Record<string, unknown> | null) => {
      if (!data) return null;
      const url = typeof data.url === "string" ? data.url : null;
      if (url) return url;
      const threadId =
        typeof data.threadId === "string" ? data.threadId : null;
      const messageId =
        typeof data.messageId === "string" ? data.messageId : null;
      if (threadId && messageId) {
        return `/chat/${threadId}?messageId=${encodeURIComponent(messageId)}&fromPush=1`;
      }
      if (threadId) return `/chat/${threadId}`;
      return "/chat";
    };

    const handleRoute = (data?: Record<string, unknown> | null) => {
      const target = routeFromData(data);
      if (!target) return;
      if (
        state === "guest" ||
        state === "error" ||
        state === "onboarding_required"
      ) {
        pendingRouteRef.current = target;
        return;
      }
      if (lastRoutedRef.current === target) return;
      lastRoutedRef.current = target;
      router.push(target as any);
    };

    (async () => {
      const response = await getInitialNotificationResponse();
      if (!mounted) return;
      handleRoute(
        response?.notification?.request?.content?.data ?? null
      );
    })().catch(() => {});

    let sub: { remove: () => void } | null = null;
    (async () => {
      sub = await addNotificationResponseListener((response) => {
        const data = response.notification?.request?.content?.data as
          | Record<string, unknown>
          | undefined;
        handleRoute(data ?? null);
      });
    })().catch(() => {});

    return () => {
      mounted = false;
      sub?.remove();
    };
  }, [state]);

  useEffect(() => {
    if (
      state === "guest" ||
      state === "error" ||
      state === "onboarding_required"
    )
      return;
    const pending = pendingRouteRef.current;
    if (!pending) return;
    if (lastRoutedRef.current === pending) return;
    lastRoutedRef.current = pending;
    pendingRouteRef.current = null;
    router.push(pending as any);
  }, [state]);

  /* ---- Sidebar data loading ---- */
  const { loadThreads, loadProjects } = useMobileSidebarData();
  const loadThreadsRef = useRef(loadThreads);
  const loadProjectsRef = useRef(loadProjects);

  useEffect(() => {
    loadThreadsRef.current = loadThreads;
    loadProjectsRef.current = loadProjects;
  }, [loadThreads, loadProjects]);

  useEffect(() => {
    if (state !== "authed") return;
    loadProjectsRef.current();
    loadThreadsRef.current(true);
  }, [state]);

  /* ---- Auth guards ---- */
  if (!ready || state === "booting") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (state === "guest" || state === "error") {
    return <Redirect href="/auth" />;
  }

  if (state === "onboarding_required") {
    return <Redirect href="/onboarding" />;
  }

  /* ---- Authed shell ---- */
  return (
    <SidebarProvider>
      <MobileAppShell>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="chat/index" />
          <Stack.Screen name="chat/[threadId]" />
          <Stack.Screen name="project/[projectId]" />
        </Stack>
      </MobileAppShell>
      <MobileSettingsModal />
    </SidebarProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
