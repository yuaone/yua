// 📂 src/ai/video/video-gesture-actions.ts
// 🎮 Gesture Action Mapping — Enterprise Version

export const GestureActions = {
  interpret(gesture: any) {
    if (gesture?.risk && gesture.risk > 80) {
      return { action: "ALERT", message: "High-risk motion detected" };
    }

    if (gesture?.push || gesture?.depthDelta < -0.15) {
      return { action: "BACK", message: "Push gesture detected → Back" };
    }

    if (gesture?.pull || gesture?.depthDelta > 0.15) {
      return { action: "OPEN", message: "Pull gesture detected → Open UI / Forward" };
    }

    if (gesture?.swipeLeft) return { action: "SWIPE_LEFT", message: "Swipe left" };
    if (gesture?.swipeRight) return { action: "SWIPE_RIGHT", message: "Swipe right" };
    if (gesture?.swipeUp) return { action: "SCROLL_UP", message: "Swipe up" };
    if (gesture?.swipeDown) return { action: "SCROLL_DOWN", message: "Swipe down" };

    if (gesture?.pinch) return { action: "SELECT", message: "Pinch → Select" };
    if (gesture?.spread) return { action: "ZOOM_IN", message: "Spread → Zoom In" };

    if (gesture?.rotateCW) return { action: "ROTATE_CW", message: "Clockwise rotation" };
    if (gesture?.rotateCCW) return { action: "ROTATE_CCW", message: "Counterclockwise rotation" };

    if (gesture?.palmOpen) return { action: "POINTER", message: "Palm Open → Pointer" };
    if (gesture?.fist) return { action: "HOLD", message: "Fist → Hold" };

    return { action: "NONE", message: "No recognizable gesture" };
  },
};

// ⭐ ControlAggregator에서 요구하는 “getLatest” 지원
let latestGesture: any = null;

export const GestureEngine = {
  setLatest(g: any) {
    latestGesture = g;
  },
  getLatest() {
    return latestGesture;
  }
};
