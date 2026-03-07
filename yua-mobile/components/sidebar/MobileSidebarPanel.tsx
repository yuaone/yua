import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import MobileProjectList from "@/components/sidebar/MobileProjectList";
import MobileThreadList from "@/components/sidebar/MobileThreadList";
import type { MobileProject, MobileThread, SidebarPanelMode } from "@/types/sidebar";

type MobileSidebarPanelProps = {
  mode: SidebarPanelMode;
  onModeChange: (mode: SidebarPanelMode) => void;
  projects: MobileProject[];
  threads: MobileThread[];
  activeProjectId: string | null;
  activeThreadId: number | null;
  onSelectThread: (threadId: number) => void;
  onSelectProject: (projectId: string | null) => void;
  onCreateThread: () => void;
  onOpenPhotoLibrary: () => void;
  onPressLogout: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export default function MobileSidebarPanel({
  mode,
  onModeChange,
  projects,
  threads,
  activeProjectId,
  activeThreadId,
  onSelectThread,
  onSelectProject,
  onCreateThread,
  onOpenPhotoLibrary,
  onPressLogout,
  onRefresh,
  refreshing = false,
}: MobileSidebarPanelProps) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.wrap}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
      }
    >
      <View style={styles.switcherRow}>
        <View style={styles.switcher}>
          <Pressable
            style={[styles.switchBtn, mode === "threads" ? styles.switchBtnActive : null]}
            onPress={() => onModeChange("threads")}
          >
            <Text style={styles.switchText}>Threads</Text>
          </Pressable>
          <Pressable
            style={[styles.switchBtn, mode === "projects" ? styles.switchBtnActive : null]}
            onPress={() => onModeChange("projects")}
          >
            <Text style={styles.switchText}>Projects</Text>
          </Pressable>
          <Pressable
            style={[styles.switchBtn, mode === "photos" ? styles.switchBtnActive : null]}
            onPress={() => {
              onModeChange("photos");
              onOpenPhotoLibrary();
            }}
          >
            <Text style={styles.switchText}>Photos</Text>
          </Pressable>
        </View>
        <Pressable style={styles.logoutChip} onPress={onPressLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.secondaryBtn} onPress={onCreateThread}>
          <Text style={styles.secondaryBtnText}>New Chat</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={onOpenPhotoLibrary}>
          <Text style={styles.secondaryBtnText}>사진보관함</Text>
        </Pressable>
      </View>

      {mode === "threads" ? (
        <MobileThreadList
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={onSelectThread}
        />
      ) : mode === "projects" ? (
        <MobileProjectList
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={onSelectProject}
        />
      ) : (
        <View style={styles.photoHintWrap}>
          <Text style={styles.photoHint}>Open the top panel to view 사진보관함 items.</Text>
        </View>
      )}

      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: "100%" },
  wrap: { gap: 12, paddingBottom: 12 },
  switcherRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  switcher: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  switchBtn: {
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  switchBtnActive: {
    backgroundColor: "#cbd5e1",
  },
  switchText: { color: "#0f172a", fontSize: 13, fontWeight: "600" },
  actionsRow: { flexDirection: "row", gap: 8 },
  secondaryBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  secondaryBtnText: { color: "#0f172a", fontSize: 12, fontWeight: "600" },
  photoHintWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
  },
  photoHint: { color: "#475569", fontSize: 12 },
  logoutChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  logoutText: { color: "#0f172a", fontSize: 12, fontWeight: "700" },
});
