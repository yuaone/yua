import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { useMobileAuth } from "@/contexts/MobileAuthContext";
import { shouldShowIntro, markIntroShown } from "@/lib/introSession";

export default function IndexRouteGuard() {
  const { ready, state } = useMobileAuth();
  const [introReady, setIntroReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const shouldShow = await shouldShowIntro();
      if (!mounted) return;
      setShowIntro(shouldShow);
      setIntroReady(true);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  // Failsafe: if stuck for 8s, force navigate to auth
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (timedOut && !ready) {
      router.replace("/auth");
      return;
    }

    if (!ready || !introReady) return;

    // authed -> skip everything, go straight to chat (permanent login)
    if (state === "authed") {
      router.replace("/(authed)/chat");
      return;
    }

    if (showIntro) {
      void markIntroShown();
      router.replace("/intro");
      return;
    }

    if (state === "onboarding_required") {
      router.replace("/onboarding");
      return;
    }

    router.replace("/auth");
  }, [introReady, ready, showIntro, state, timedOut]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" />
      <Text style={styles.text}>Preparing app...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  text: {
    fontSize: 14,
    color: "#475569",
  },
});
