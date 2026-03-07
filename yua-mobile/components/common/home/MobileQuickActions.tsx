import { Pressable, StyleSheet, Text, View } from "react-native";

type Action = {
  label: string;
  icon: string;
  onPress?: () => void;
};

export default function MobileQuickActions({
  onSelect,
}: {
  onSelect?: (label: string) => void;
}) {
  const actions: Action[] = [
    { label: "조언 구하기", icon: "🎓" },
    { label: "계획 짜기", icon: "💡" },
    { label: "텍스트 요약", icon: "📄" },
    { label: "재미있는 정보", icon: "📦" },
  ];

  return (
    <View style={styles.wrap}>
      {actions.map((a) => (
        <Pressable
          key={a.label}
          style={styles.btn}
          onPress={() => onSelect?.(a.label)}
        >
          <Text style={styles.icon}>{a.icon}</Text>
          <Text style={styles.label}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  btn: {
    width: "48%",
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
});