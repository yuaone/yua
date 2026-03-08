import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { MobileAuthProvider } from "@/contexts/MobileAuthContext";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useTheme } from "@/hooks/useTheme";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function RootLayout() {
  const { isDark } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <ErrorBoundary>
          <MobileAuthProvider>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="intro/index" options={{ headerShown: false }} />
              <Stack.Screen name="auth/index" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
              <Stack.Screen name="legal/terms/index" options={{ headerShown: false }} />
              <Stack.Screen name="legal/privacy/index" options={{ headerShown: false }} />
              <Stack.Screen name="(authed)" options={{ headerShown: false }} />
            </Stack>
          </MobileAuthProvider>
        </ErrorBoundary>
        <StatusBar style={isDark ? "light" : "dark"} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
