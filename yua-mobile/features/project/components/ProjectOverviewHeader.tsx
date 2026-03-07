import { StyleSheet, Text, View } from "react-native";

type ProjectOverviewHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function ProjectOverviewHeader({ title, subtitle }: ProjectOverviewHeaderProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#475569" },
});
