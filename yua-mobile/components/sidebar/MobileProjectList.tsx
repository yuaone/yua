import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import type { MobileProject } from "@/types/sidebar";

type MobileProjectListProps = {
  projects: MobileProject[];
  activeProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
};

export default function MobileProjectList({
  projects,
  activeProjectId,
  onSelectProject,
}: MobileProjectListProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [
          styles.item,
          { borderColor: colors.line, backgroundColor: colors.surfacePanel },
          activeProjectId == null && { borderColor: colors.linkColor, backgroundColor: colors.wash },
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => onSelectProject(null)}
      >
        <Text style={[styles.text, { color: colors.textPrimary }]}>General</Text>
      </Pressable>
      {projects.map((project) => (
        <Pressable
          key={project.id}
          style={({ pressed }) => [
            styles.item,
            { borderColor: colors.line, backgroundColor: colors.surfacePanel },
            activeProjectId === project.id && { borderColor: colors.linkColor, backgroundColor: colors.wash },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => onSelectProject(project.id)}
        >
          <Text style={[styles.text, { color: colors.textPrimary }]}>{project.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  item: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  text: { fontSize: 14, fontWeight: "500" },
});
