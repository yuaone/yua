import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import ProjectOverviewCompose from "@/features/project/components/ProjectOverviewCompose";
import ProjectOverviewHeader from "@/features/project/components/ProjectOverviewHeader";
import ProjectThreadList from "@/features/project/components/ProjectThreadList";
import { useMobileProjectOverview } from "@/features/project/hooks/useMobileProjectOverview";

export default function MobileProjectOverviewScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const safeProjectId = String(projectId ?? "");

  const { project, projectThreads, createThreadWithPrompt } = useMobileProjectOverview(safeProjectId);

  const onCreate = async (text: string) => {
    const threadId = await createThreadWithPrompt(text);
    if (!threadId) {
      Alert.alert("Project", "Failed to create thread for this project.");
      return;
    }
    router.replace(`/chat/${threadId}`);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <ProjectOverviewHeader
        title={project?.name ?? "Project"}
        subtitle={`Project ID: ${safeProjectId}`}
      />

      <ProjectOverviewCompose onSubmit={onCreate} />

      <View style={styles.section}>
        <ProjectThreadList
          threads={projectThreads}
          onPressThread={(threadId) => router.replace(`/chat/${threadId}`)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  section: { gap: 8 },
});
