import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { router } from "expo-router";

import { useTheme } from "@/hooks/useTheme";

export default function IntroScreen() {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1400, easing: Easing.linear }),
      -1,
      false
    );

    const timer = setTimeout(() => {
      router.replace("/auth");
    }, 5000);

    return () => clearTimeout(timer);
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 300 }, { rotateY: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.introBg }]}>
      <Animated.Text
        style={[styles.logoText, { color: colors.introLogoText }, animatedStyle]}
      >
        YUA
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 34,
    letterSpacing: 6,
    fontWeight: "800",
  },
});
