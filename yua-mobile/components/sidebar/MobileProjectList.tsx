import { Pressable, StyleSheet, Text, View } from "react-native";

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
  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.item, activeProjectId == null ? styles.itemActive : null]}
        onPress={() => onSelectProject(null)}
      >
        <Text style={styles.text}>General</Text>
      </Pressable>
      {projects.map((project) => (
        <Pressable
          key={project.id}
          style={[styles.item, activeProjectId === project.id ? styles.itemActive : null]}
          onPress={() => onSelectProject(project.id)}
        >
          <Text style={styles.text}>{project.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  item: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
  },
  itemActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  text: { color: "#0f172a", fontSize: 14, fontWeight: "500" },
});
