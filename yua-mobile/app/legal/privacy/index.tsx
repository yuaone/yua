import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ExternalLink } from "@/components/external-link";

const WEB_BASE = (process.env.EXPO_PUBLIC_WEB_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:3000").replace(/\/+$/, "");

export default function PrivacyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>개인정보처리방침</Text>
        <Text style={styles.body}>
          자세한 개인정보처리방침은 아래 링크에서 확인하세요. 모바일 화면은 참고용 요약입니다.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YUA 개인정보처리방침</Text>
          <ExternalLink href={`${WEB_BASE}/policies/privacy`} style={styles.link}>
            <Text style={styles.linkText}>YUA 개인정보처리방침 보기</Text>
          </ExternalLink>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>외부 제공자 정책(참고)</Text>
          <ExternalLink href="https://openai.com/policies/privacy-policy/" style={styles.link}>
            <Text style={styles.linkText}>OpenAI Privacy Policy (외부)</Text>
          </ExternalLink>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 20, backgroundColor: "#f8fafc" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  body: { fontSize: 14, color: "#475569", marginTop: 8, lineHeight: 20 },
  section: { marginTop: 16, gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  link: { marginTop: 6 },
  linkText: { fontSize: 13, color: "#2563eb", fontWeight: "600" },
});
