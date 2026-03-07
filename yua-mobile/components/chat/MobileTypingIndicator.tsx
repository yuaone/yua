import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const DOT_SIZE = 7;
const BOUNCE_HEIGHT = -6;
const DURATION = 320;
const STAGGER = 140;

function Dot({ index }: { index: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      index * STAGGER,
      withRepeat(
        withSequence(
          withTiming(BOUNCE_HEIGHT, {
            duration: DURATION,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(0, {
            duration: DURATION,
            easing: Easing.in(Easing.quad),
          }),
        ),
        -1,
        false,
      ),
    );
  }, [index, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export default function MobileTypingIndicator() {
  return (
    <View style={styles.container}>
      <Dot index={0} />
      <Dot index={1} />
      <Dot index={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 4,
    height: 32,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: "#94a3b8",
  },
});
