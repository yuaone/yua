import { createContext, useContext, type ReactNode } from "react";
import {
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from "react-native-reanimated";

/* ==============================
   Types
============================== */

type SidebarContextValue = {
  /** 0 = closed, 1 = open (animated) */
  progress: SharedValue<number>;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
};

const SidebarCtx = createContext<SidebarContextValue | null>(null);

/* ==============================
   Provider
============================== */

const DURATION = 300;
const EASING_OPEN = Easing.out(Easing.cubic);
const EASING_CLOSE = Easing.out(Easing.quad);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const progress = useSharedValue(0);

  const openSidebar = () => {
    progress.value = withTiming(1, {
      duration: DURATION,
      easing: EASING_OPEN,
    });
  };

  const closeSidebar = () => {
    progress.value = withTiming(0, {
      duration: DURATION,
      easing: EASING_CLOSE,
    });
  };

  const toggleSidebar = () => {
    if (progress.value > 0.5) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };

  return (
    <SidebarCtx.Provider
      value={{ progress, openSidebar, closeSidebar, toggleSidebar }}
    >
      {children}
    </SidebarCtx.Provider>
  );
}

/* ==============================
   Hook
============================== */

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarCtx);
  if (!ctx) {
    throw new Error("useSidebar must be used within <SidebarProvider>");
  }
  return ctx;
}
