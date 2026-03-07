import { type ReactNode, useCallback } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
} from "react-native-reanimated";

import MobileSidebarContent from "@/components/sidebar/MobileSidebarContent";
import { useSidebar } from "@/components/layout/SidebarContext";

/* ==============================
   Constants
============================== */

const SCREEN_WIDTH = Dimensions.get("window").width;
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 360);
const EDGE_SWIPE_ZONE = 20;
const SWIPE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 500;

/* ==============================
   MobileAppShell

   Wraps main content with a left sidebar drawer.
   Uses reanimated shared value from SidebarContext.
============================== */

type MobileAppShellProps = {
  children: ReactNode;
};

export default function MobileAppShell({ children }: MobileAppShellProps) {
  const { progress, openSidebar, closeSidebar } = useSidebar();

  /* ---- Gesture: left edge swipe to open ---- */
  const openGesture = Gesture.Pan()
    .activeOffsetX(15)
    .failOffsetY([-20, 20])
    .onStart((event) => {
      // Only trigger from left edge
      if (event.x > EDGE_SWIPE_ZONE) {
        return;
      }
    })
    .onUpdate((event) => {
      if (event.x > EDGE_SWIPE_ZONE && progress.value === 0) {
        // Started outside edge zone, ignore
        return;
      }
      const raw = event.translationX / SIDEBAR_WIDTH;
      progress.value = Math.max(0, Math.min(1, raw));
    })
    .onEnd((event) => {
      const shouldOpen =
        event.translationX > SWIPE_THRESHOLD ||
        event.velocityX > VELOCITY_THRESHOLD;
      if (shouldOpen) {
        runOnJS(openSidebar)();
      } else {
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
        runOnJS(closeSidebar)();
      } else {
        runOnJS(openSidebar)();
      }
    });

  /* ---- Animated styles ---- */
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.4]),
    pointerEvents: progress.value > 0.01 ? "auto" : "none",
  }));

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

  return (
    <View style={styles.root}>
      {/* Main content area with edge swipe detector */}
      <GestureDetector gesture={openGesture}>
        <View style={styles.mainContent}>{children}</View>
      </GestureDetector>

      {/* Backdrop overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.backdrop,
          backdropStyle,
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
            { width: SIDEBAR_WIDTH },
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
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
  },
});
