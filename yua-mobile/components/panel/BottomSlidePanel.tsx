import { useEffect, useMemo, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import PanelBackdrop from "@/components/panel/PanelBackdrop";
import { MobileTokens } from "@/constants/tokens";

type BottomSlidePanelProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  swipeToClose?: boolean;
  renderWhenClosed?: boolean;
};

const PANEL_SPRING = MobileTokens.spring.sheet;

export default function BottomSlidePanel({
  visible,
  onClose,
  title,
  children,
  closeOnBackdrop = true,
  swipeToClose = true,
  renderWhenClosed = false,
}: BottomSlidePanelProps) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);
  const [panelHeight, setPanelHeight] = useState(0);
  const [mounted, setMounted] = useState(visible || renderWhenClosed);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, PANEL_SPRING);
      return;
    }

    progress.value = withSpring(0, PANEL_SPRING, (finished) => {
      if (finished && !renderWhenClosed) {
        runOnJS(setMounted)(false);
      }
    });
  }, [visible, renderWhenClosed, progress]);

  const closedTranslateY = useMemo(() => {
    const fallbackHeight = Math.round(Dimensions.get("window").height * 0.6);
    const height = panelHeight > 0 ? panelHeight : fallbackHeight;
    return height + insets.bottom + 24;
  }, [panelHeight, insets.bottom]);

  const panelStyle = useAnimatedStyle(() => {
    const baseY = interpolate(progress.value, [0, 1], [closedTranslateY, 0]);
    return {
      transform: [{ translateY: baseY + dragY.value }],
    };
  });

  const panGesture = Gesture.Pan()
    .enabled(swipeToClose)
    .onUpdate((event) => {
      if (event.translationY > 0) {
        dragY.value = event.translationY;
      } else {
        dragY.value = 0;
      }
    })
    .onEnd((event) => {
      const shouldClose =
        event.translationY > 40 || event.velocityY > 800;
      dragY.value = withTiming(0, { duration: 120 });
      if (shouldClose) {
        runOnJS(onClose)();
      }
    });

  if (!mounted && !renderWhenClosed) return null;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <PanelBackdrop
        progress={progress}
        interactive={mounted}
        onPress={closeOnBackdrop ? onClose : undefined}
      />

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.panel,
            panelStyle,
            {
              paddingBottom: insets.bottom + 8,
              maxHeight: isTablet ? "55%" : "65%",
            },
          ]}
          onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title ?? "Activity"}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "65%",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  headerRow: {
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  closeBtn: {
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
  },
  content: {
    padding: 16,
    gap: 10,
  },
});
