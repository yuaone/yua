/**
 * YUA Mobile Design Tokens (SSOT)
 *
 * 모바일 전용 spacing, sizing, radius, typography, shadow, animation 토큰.
 * 색상은 theme.ts에서 관리 (웹과 동일 값).
 * 모든 컴포넌트는 이 토큰을 통해 일관된 디자인 적용.
 */

import { Platform } from "react-native";

export const MobileTokens = {
  /* ============================
     Spacing (8pt grid)
  ============================ */
  space: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },

  /* ============================
     Touch Targets
  ============================ */
  touch: {
    min: 44,
    comfortable: 48,
    large: 56,
    xl: 64,
  },

  /* ============================
     Border Radius
  ============================ */
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 999,
    bubble: 18,
    bubbleCorner: 4,
    input: 24,
    card: 16,
    avatar: 14,
    chip: 12,
    codeBlock: 12,
    actionSheet: 14,
  },

  /* ============================
     Typography
  ============================ */
  font: {
    xxs: 10,
    xs: 11,
    sm: 13,
    md: 15,
    body: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    title: 34,
  },

  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
    code: 1.4,
  },

  /* ============================
     Shadows
  ============================ */
  shadow: {
    none: Platform.select({
      ios: { shadowOpacity: 0 } as const,
      android: { elevation: 0 } as const,
      default: { elevation: 0 } as const,
    })!,
    sm: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      } as const,
      android: { elevation: 2 } as const,
      default: { elevation: 2 } as const,
    })!,
    md: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      } as const,
      android: { elevation: 4 } as const,
      default: { elevation: 4 } as const,
    })!,
    lg: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
      } as const,
      android: { elevation: 8 } as const,
      default: { elevation: 8 } as const,
    })!,
    input: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      } as const,
      android: { elevation: 3 } as const,
      default: { elevation: 3 } as const,
    })!,
  },

  /* ============================
     Animation (Reanimated)
  ============================ */
  spring: {
    gentle: { damping: 20, stiffness: 150, mass: 1 },
    snappy: { damping: 15, stiffness: 300, mass: 0.8 },
    bouncy: { damping: 10, stiffness: 200, mass: 1 },
    sheet: { damping: 25, stiffness: 400, mass: 0.9 },
    sidebar: { damping: 28, stiffness: 380, mass: 0.9 },
  },

  timing: {
    fast: 150,
    normal: 250,
    slow: 400,
    sheetOpen: 300,
    sheetClose: 220,
    sidebarOpen: 300,
    sidebarClose: 250,
  },

  /* ============================
     Breakpoints
  ============================ */
  breakpoint: {
    smallPhone: 375,
    phone: 390,
    largePhone: 428,
    tablet: 768,
    largeTablet: 1024,
  },

  /* ============================
     Layout Constants
  ============================ */
  layout: {
    topBarHeight: 56,
    inputBarMinHeight: 52,
    inputBarMaxHeight: 200,
    sidebarWidth: 320,
    sidebarOverlayPercent: 0.8,
    sidebarEdgeZone: 20,
    messageGap: 24,
    messagePadPhone: 14,
    messagePadLargePhone: 16,
    messagePadTablet: 24,
    inputPadPhone: 12,
    inputPadLargePhone: 16,
    inputPadTablet: 20,
    avatarSize: 28,
    avatarSizeTablet: 32,
    scrollButtonSize: 40,
    actionButtonSize: 32,
    actionIconSize: 16,
    chipHeight: 28,
    searchBarHeight: 44,
  },
} as const;
