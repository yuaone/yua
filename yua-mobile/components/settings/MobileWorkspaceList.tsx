import { useCallback } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { router } from "expo-router";

import { useMobileAuth } from "@/contexts/MobileAuthContext";
import { useMobileChatStore } from "@/store/useMobileChatStore";
import { useMobileSidebarStore } from "@/store/useMobileSidebarStore";
import { useMobileSettingsStore } from "@/store/useMobileSettingsStore";

/* ==============================
   Types
============================== */

type WorkspaceItem = {
  id: string;
  name: string;
  plan?: string;
};

/* ==============================
   Component
============================== */

export default function MobileWorkspaceList({
  onClose,
}: {
  onClose: () => void;
}) {
  const dark = useColorScheme() === "dark";
  const { profile } = useMobileAuth();
  const { closeSettings } = useMobileSettingsStore();

  const workspaces: WorkspaceItem[] = profile?.workspaces ?? [];
  const currentId = profile?.workspace?.id ?? null;

  const handleSelect = useCallback(
    (ws: WorkspaceItem) => {
      if (ws.id === currentId) {
        onClose();
        return;
      }

      // Clear stores
      useMobileChatStore.getState().reset();
      useMobileSidebarStore.getState().resetSidebar();

      // TODO: Switch workspace via API when backend supports it
      // For now, the workspace switching requires re-auth or API call
      // e.g. POST /api/workspaces/switch { workspaceId: ws.id }

      closeSettings();
      onClose();
      router.replace("/(authed)/chat" as any);
    },
    [currentId, closeSettings, onClose]
  );

  if (workspaces.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: dark ? "#6b7280" : "#9ca3af" }]}>
          사용 가능한 워크스페이스가 없습니다
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: WorkspaceItem }) => {
    const isActive = item.id === currentId;
    return (
      <Pressable
        onPress={() => handleSelect(item)}
        style={({ pressed }) => [
          styles.wsItem,
          isActive && {
            backgroundColor: dark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.04)",
          },
          pressed && { opacity: 0.7 },
        ]}
      >
        {/* Icon placeholder */}
        <View
          style={[
            styles.wsIcon,
            {
              backgroundColor: dark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <Text
            style={[
              styles.wsIconText,
              { color: dark ? "#f5f5f5" : "#111111" },
            ]}
          >
            {(item.name ?? "W").charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.wsInfo}>
          <Text
            numberOfLines={1}
            style={[
              styles.wsName,
              { color: dark ? "#f5f5f5" : "#111111" },
            ]}
          >
            {item.name}
          </Text>
          {item.plan ? (
            <Text
              style={[
                styles.wsPlan,
                { color: dark ? "#6b7280" : "#9ca3af" },
              ]}
            >
              {item.plan}
            </Text>
          ) : null}
        </View>

        {isActive ? (
          <View style={styles.activeIndicator}>
            <Text style={styles.activeCheck}>✓</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <FlatList
      data={workspaces}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

/* ==============================
   Styles
============================== */

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 4,
  },
  wsItem: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 16,
    gap: 12,
  },
  wsIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  wsIconText: {
    fontSize: 16,
    fontWeight: "700",
  },
  wsInfo: {
    flex: 1,
    gap: 2,
  },
  wsName: {
    fontSize: 15,
    fontWeight: "600",
  },
  wsPlan: {
    fontSize: 12,
  },
  activeIndicator: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  activeCheck: {
    fontSize: 16,
    color: "#10b981",
    fontWeight: "700",
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
});
