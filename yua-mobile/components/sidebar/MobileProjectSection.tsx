import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { useTheme } from "@/hooks/useTheme";
import { useMobileSidebarStore } from "@/store/useMobileSidebarStore";
import type { MobileProject, MobileThread } from "@/types/sidebar";

/* ==============================
   Project Item (internal)
============================== */

function ProjectItem({
  project,
  isActive,
  isOpen,
  threadCount,
  onToggle,
  onPress,
}: {
  project: MobileProject;
  isActive: boolean;
  isOpen: boolean;
  threadCount: number;
  onToggle: () => void;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.projectRow,
        isActive && { backgroundColor: colors.sidebarActiveItem },
      ]}
    >
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        style={styles.toggleBtn}
      >
        <Text style={[styles.toggleIcon, { color: colors.textMuted }]}>
          {isOpen ? "\u25BE" : "\u25B8"}
        </Text>
      </Pressable>

      <Text style={[styles.folderIcon, { color: isActive ? colors.textPrimary : colors.textMuted }]}>
        {"\uD83D\uDCC1"}
      </Text>

      <Pressable onPress={onPress} style={styles.projectNameBtn}>
        <Text
          numberOfLines={1}
          style={[
            styles.projectName,
            { color: colors.textPrimary },
            isActive && styles.projectNameActive,
          ]}
        >
          {project.name}
        </Text>
      </Pressable>

      {threadCount > 0 && (
        <Text style={[styles.threadCount, { color: colors.textMuted }]}>
          {threadCount}
        </Text>
      )}
    </View>
  );
}

/* ==============================
   Thread sub-item (internal)
============================== */

function ProjectThreadItem({
  thread,
  isActive,
  onPress,
}: {
  thread: MobileThread;
  isActive: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.threadSubItem,
        isActive && {
          backgroundColor: colors.sidebarActiveItem,
          borderLeftWidth: 2,
          borderLeftColor: "#8b5cf6",
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.threadSubTitle, { color: colors.textSecondary }]}
      >
        {thread.pinned ? "\uD83D\uDCCC " : ""}
        {thread.title || "New Chat"}
      </Text>
    </Pressable>
  );
}

/* ==============================
   MobileProjectSection
============================== */

export default function MobileProjectSection({
  threads,
  activeThreadId,
  onSelectThread,
}: {
  threads: MobileThread[];
  activeThreadId: number | null;
  onSelectThread: (threadId: number, projectId: string | null) => void;
}) {
  const { colors } = useTheme();
  const { projects, activeProjectId, setActiveContext } = useMobileSidebarStore();

  // Collapsible state per project
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  // Auto-open the active project
  useEffect(() => {
    if (activeProjectId) {
      setOpenMap((m) => (m[activeProjectId] ? m : { ...m, [activeProjectId]: true }));
    }
  }, [activeProjectId]);

  // Group threads by project
  const threadsByProject = useMemo(() => {
    const map: Record<string, MobileThread[]> = {};
    for (const t of threads) {
      const pid = t.projectId;
      if (pid) {
        if (!map[pid]) map[pid] = [];
        map[pid].push(t);
      }
    }
    return map;
  }, [threads]);

  const toggleProject = useCallback((pid: string) => {
    setOpenMap((m) => ({ ...m, [pid]: !m[pid] }));
  }, []);

  const handleProjectPress = useCallback(
    (project: MobileProject) => {
      setActiveContext(project.id, null);
      router.push(`/(authed)/project/${project.id}` as any);
    },
    [setActiveContext]
  );

  if (projects.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { borderBottomColor: colors.line }]}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          PROJECTS
        </Text>
      </View>

      {projects.map((p) => {
        const pid = String(p.id);
        const projectThreads = threadsByProject[pid] ?? [];
        const isActive = String(activeProjectId) === pid;
        const isOpen = openMap[pid] ?? isActive;

        return (
          <View key={pid}>
            <ProjectItem
              project={p}
              isActive={isActive}
              isOpen={isOpen}
              threadCount={projectThreads.length}
              onToggle={() => toggleProject(pid)}
              onPress={() => handleProjectPress(p)}
            />

            {isOpen && projectThreads.length > 0 && (
              <View style={styles.threadSubList}>
                {projectThreads.map((t) => (
                  <ProjectThreadItem
                    key={t.id}
                    thread={t}
                    isActive={activeThreadId === t.id}
                    onPress={() => onSelectThread(t.id, t.projectId)}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

/* ==============================
   Styles
============================== */

const styles = StyleSheet.create({
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    gap: 6,
  },
  toggleBtn: {
    width: 16,
    alignItems: "center",
  },
  toggleIcon: {
    fontSize: 12,
  },
  folderIcon: {
    fontSize: 14,
  },
  projectNameBtn: {
    flex: 1,
    minWidth: 0,
  },
  projectName: {
    fontSize: 14,
    fontWeight: "600",
  },
  projectNameActive: {
    fontWeight: "700",
  },
  threadCount: {
    fontSize: 11,
    fontWeight: "500",
  },
  threadSubList: {
    paddingLeft: 28,
    marginTop: 2,
    marginBottom: 4,
  },
  threadSubItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 1,
  },
  threadSubTitle: {
    fontSize: 13,
    fontWeight: "500",
  },
});
