import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { useTheme } from "@/hooks/useTheme";
import ProjectOverviewCompose from "@/features/project/components/ProjectOverviewCompose";
import ProjectOverviewHeader from "@/features/project/components/ProjectOverviewHeader";
import ProjectThreadList from "@/features/project/components/ProjectThreadList";
import { useMobileProjectOverview } from "@/features/project/hooks/useMobileProjectOverview";

export default function MobileProjectOverviewScreen() {
  const { colors } = useTheme();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const safeProjectId = String(projectId ?? "");

  const { project, projectThreads, createThreadWithPrompt } = useMobileProjectOverview(safeProjectId);

  const onCreate = async (text: string) => {
    const threadId = await createThreadWithPrompt(text);
    if (!threadId) {
      Alert.alert("Project", "Failed to create thread for this project.");
      return;
    }
    router.replace(`/(authed)/chat/${threadId}` as any);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.surfaceMain }]}
      contentContainerStyle={styles.content}
    >
      <ProjectOverviewHeader
        title={project?.name ?? "Project"}
        subtitle={"\uC774 \uD504\uB85C\uC81D\uD2B8\uC758 \uBAA8\uB4E0 \uB300\uD654\uB97C \uD55C \uACF3\uC5D0\uC11C \uAD00\uB9AC\uD558\uACE0 \uC2DC\uC791\uD558\uC138\uC694."}
      />

      <ProjectOverviewCompose onSubmit={onCreate} />

      <View style={[styles.section, { borderTopColor: colors.line }]}>
        {projectThreads.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {"\uC544\uC9C1 \uB300\uD654\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {"\uC704 \uC785\uB825\uCC3D\uC5D0\uC11C \uC0C8\uB85C\uC6B4 \uB300\uD654\uB97C \uC2DC\uC791\uD558\uC138\uC694."}
            </Text>
          </View>
        ) : (
          <ProjectThreadList
            threads={projectThreads}
            onPressThread={(threadId) =>
              router.replace(`/(authed)/chat/${threadId}` as any)
            }
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  section: {
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySub: {
    fontSize: 14,
  },
});
