import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
import {
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { MobileTokens } from "@/constants/tokens";

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

const SPRING_CONFIG = MobileTokens.spring.sidebar;

export function SidebarProvider({ children }: { children: ReactNode }) {
  const progress = useSharedValue(0);
  const isOpenRef = useRef(false);

  const openSidebar = useCallback(() => {
    isOpenRef.current = true;
    progress.value = withSpring(1, SPRING_CONFIG);
  }, [progress]);

  const closeSidebar = useCallback(() => {
    isOpenRef.current = false;
    progress.value = withSpring(0, SPRING_CONFIG);
  }, [progress]);

  const toggleSidebar = useCallback(() => {
    if (isOpenRef.current) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }, [openSidebar, closeSidebar]);

  const value = useMemo(
    () => ({ progress, openSidebar, closeSidebar, toggleSidebar }),
    [progress, openSidebar, closeSidebar, toggleSidebar]
  );

  return (
    <SidebarCtx.Provider value={value}>
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
