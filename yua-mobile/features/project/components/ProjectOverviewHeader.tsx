import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";

type ProjectOverviewHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function ProjectOverviewHeader({ title, subtitle }: ProjectOverviewHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 4 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
});
