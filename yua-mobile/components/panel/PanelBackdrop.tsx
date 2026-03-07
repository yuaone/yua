import { Pressable, StyleSheet } from "react-native";
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";

type PanelBackdropProps = {
  progress: SharedValue<number>;
  interactive: boolean;
  onPress?: () => void;
};

export default function PanelBackdrop({
  progress,
  interactive,
  onPress,
}: PanelBackdropProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.35]),
  }));

  return (
    <Animated.View
      pointerEvents={interactive ? "auto" : "none"}
      style={[StyleSheet.absoluteFillObject, styles.backdrop, animatedStyle]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "#020617",
  },
});
