import { type ReactNode, useCallback } from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import MobileSidebarContent from "@/components/sidebar/MobileSidebarContent";
import { useSidebar } from "@/components/layout/SidebarContext";
import { useTheme } from "@/hooks/useTheme";
import { useAdaptive } from "@/constants/adaptive";
import { MobileTokens } from "@/constants/tokens";

/* ==============================
   Constants
============================== */

const SWIPE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 500;
const SPRING_CONFIG = MobileTokens.spring.sidebar;

/* ==============================
   MobileAppShell

   Wraps main content with a left sidebar drawer.
   Uses reanimated shared value from SidebarContext.
   On tablets (sidebarFixed), sidebar is permanently visible.
============================== */

type MobileAppShellProps = {
  children: ReactNode;
};

export default function MobileAppShell({ children }: MobileAppShellProps) {
  const { progress, openSidebar, closeSidebar } = useSidebar();
  const { colors } = useTheme();
  const { sidebarWidth, sidebarFixed } = useAdaptive();

  const EDGE_SWIPE_ZONE = MobileTokens.layout.sidebarEdgeZone; // 20
  const SIDEBAR_WIDTH = sidebarWidth;

  // Track whether the open gesture started in the edge zone (worklet-safe)
  const gestureStartedInEdge = useSharedValue(false);

  /* ---- Animated styles ---- */

  // Backdrop: always mounted, pointer-events controlled by animated style
  const backdropAnimStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0, 0.4]);
    return {
      opacity,
      // Hide pointer events when fully closed to allow touches through
      pointerEvents: progress.value > 0.01 ? "auto" : "none",
    };
  });

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [-SIDEBAR_WIDTH, 0]
        ),
      },
    ],
  }));

  const handleBackdropPress = useCallback(() => {
    closeSidebar();
  }, [closeSidebar]);

  /* ---- Tablet layout: sidebar always visible ---- */
  if (sidebarFixed) {
    return (
      <View style={styles.root}>
        <View style={[styles.fixedSidebar, { width: SIDEBAR_WIDTH, backgroundColor: colors.sidebarBg }]}>
          <MobileSidebarContent />
        </View>
        <View style={[styles.mainContent, { marginLeft: SIDEBAR_WIDTH }]}>
          {children}
        </View>
      </View>
    );
  }

  /* ---- Gesture: left edge swipe to open ---- */
  const openGesture = Gesture.Pan()
    .activeOffsetX(15)
    .failOffsetY([-20, 20])
    .onStart((event) => {
      // Record whether the gesture started within the edge zone
      gestureStartedInEdge.value = event.x <= EDGE_SWIPE_ZONE;
    })
    .onUpdate((event) => {
      // Only allow gesture if it started in the edge zone
      if (!gestureStartedInEdge.value) return;
      const raw = event.translationX / SIDEBAR_WIDTH;
      progress.value = Math.max(0, Math.min(1, raw));
    })
    .onEnd((event) => {
      if (!gestureStartedInEdge.value) return;
      const shouldOpen =
        event.translationX > SWIPE_THRESHOLD ||
        event.velocityX > VELOCITY_THRESHOLD;
      if (shouldOpen) {
        progress.value = withSpring(1, SPRING_CONFIG);
        runOnJS(openSidebar)();
      } else {
        progress.value = withSpring(0, SPRING_CONFIG);
        runOnJS(closeSidebar)();
      }
    });

  /* ---- Gesture: swipe sidebar closed ---- */
  const closeGesture = Gesture.Pan()
    .activeOffsetX(-15)
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      if (event.translationX > 0) return;
      const raw = 1 + event.translationX / SIDEBAR_WIDTH;
      progress.value = Math.max(0, Math.min(1, raw));
    })
    .onEnd((event) => {
      const shouldClose =
        event.translationX < -SWIPE_THRESHOLD ||
        event.velocityX < -VELOCITY_THRESHOLD;
      if (shouldClose) {
        progress.value = withSpring(0, SPRING_CONFIG);
        runOnJS(closeSidebar)();
      } else {
        progress.value = withSpring(1, SPRING_CONFIG);
        runOnJS(openSidebar)();
      }
    });

  return (
    <View style={styles.root}>
      {/* Main content area with edge swipe detector */}
      <GestureDetector gesture={openGesture}>
        <Animated.View style={styles.mainContent}>{children}</Animated.View>
      </GestureDetector>

      {/* Backdrop overlay — always mounted, opacity/pointerEvents animated */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.backdrop,
          backdropAnimStyle,
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
      </Animated.View>

      {/* Sidebar drawer */}
      <GestureDetector gesture={closeGesture}>
        <Animated.View
          style={[
            styles.sidebar,
            sidebarStyle,
            { width: SIDEBAR_WIDTH, backgroundColor: colors.sidebarBg },
          ]}
        >
          <MobileSidebarContent />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/* ==============================
   Styles
============================== */

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: "#000",
    zIndex: 10,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
  },
  fixedSidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 1,
  },
});
