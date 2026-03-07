import { StyleSheet, Text, View } from "react-native";

export default function MobileHero() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>무엇을 도와드릴까요?</Text>
      <Text style={styles.sub}>
        질문을 하거나 아래 추천 기능을 사용해보세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  sub: {
    fontSize: 14,
    color: "#64748b",
  },
});