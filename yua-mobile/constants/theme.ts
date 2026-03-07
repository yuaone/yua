/**
 * YUA Mobile Theme Tokens (SSOT)
 *
 * Maps 1:1 to web CSS variables (--surface-main, --text-primary, etc.)
 * All components MUST use useTheme() to access these colors.
 */

import { Platform } from "react-native";

/* ==============================
   Light Colors
============================== */

export const lightColors = {
  // Surfaces
  surfaceMain: "#ffffff",
  surfaceSidebar: "#f8f8f8",
  surfacePanel: "#f4f4f4",
  appBg: "#faf9f7",

  // Text
  textPrimary: "#111111",
  textSecondary: "#374151",
  textMuted: "#9ca3af",
  textHeading: "#0b1220",

  // Lines & Wash
  line: "rgba(0,0,0,0.08)",
  wash: "rgba(0,0,0,0.04)",

  // Interactive
  linkColor: "#2563eb",
  buttonBg: "#0b0f19",
  buttonText: "#ffffff",
  buttonDisabledBg: "#94a3b8",

  // Status
  statusRunning: "#3b82f6",
  statusOk: "#22c55e",
  statusFailed: "#ef4444",

  // Input
  inputBg: "transparent",
  inputBorder: "rgba(0,0,0,0.08)",
  inputFocusBorder: "rgba(0,0,0,0.3)",
  inputPlaceholder: "#9ca3af",
  inputShellBg: "#ffffff",
  inputShellBorder: "#e2e8f0",
  inputShellFocusBorder: "#0f172a",
  inputText: "#0f172a",

  // Sidebar
  sidebarBg: "#f8f8f8",
  sidebarActiveItem: "rgba(0,0,0,0.06)",
  sidebarNewChatBg: "#ffffff",

  // Overlay
  overlayBg: "rgba(0,0,0,0.4)",

  // Attachment
  attachCardBg: "rgba(0,0,0,0.04)",
  attachCardBorder: "rgba(0,0,0,0.08)",
  attachFileBg: "#f8fafc",

  // Error
  errorColor: "#dc2626",
  errorBg: "#fff1f2",
  errorBorder: "#f5c2c2",
  errorTitleColor: "#991b1b",
  errorBodyColor: "#7f1d1d",
  errorGhostBg: "#ffffff",
  errorGhostBorder: "#fecaca",

  // Auth specific
  authBg: "#faf9f7",
  googleIconBg: "#ffffff",
  googleIconColor: "#111827",
  divider: "rgba(15,23,42,0.08)",
  dividerText: "rgba(15,23,42,0.45)",
  placeholder: "rgba(15,23,42,0.35)",
  consentText: "rgba(15,23,42,0.45)",
  secondaryBtnBorder: "rgba(0,0,0,0.1)",

  // Thinking panel
  thinkPanelBg: "#f0f4ff",
  thinkPanelBorder: "#dbe4ff",
  thinkPanelLabel: "#1e3a8a",
  thinkPanelInline: "#334155",
  thinkPanelSummary: "#475569",
  thinkChipBg: "#dbeafe",
  thinkChipColor: "#1e40af",
  thinkDeepChipBg: "#0f172a",
  thinkDeepChipColor: "#ffffff",

  // Chat
  userBubbleBg: "rgba(0,0,0,0.04)",
  userBubbleText: "#111111",
  suggestionBorder: "rgba(0,0,0,0.06)",
  closeTextColor: "#475569",
  scrollBtnBg: "rgba(255,255,255,0.9)",
  scrollBtnText: "#4b5563",

  // Message item
  systemBubbleBg: "#eef2ff",
  systemBubbleBorder: "#cbd5e1",
  systemBubbleText: "#334155",
  highlightBorder: "#f59e0b",
  highlightBg: "#fffbeb",

  // Icon buttons
  iconBtnBg: "#f1f5f9",
  iconBtnText: "#0f172a",

  // Typing indicator dot
  typingDot: "#94a3b8",

  // Stream overlay inline fallback
  inlineFallbackText: "#1f2937",

  // Drawer
  drawerBg: "#ffffff",
  drawerHandleIndicator: "rgba(0,0,0,0.15)",
  chunkCardBg: "rgba(0,0,0,0.03)",
  skeletonBg: "rgba(0,0,0,0.06)",
  summariesTitleColor: "#9ca3af",

  // Plus panel
  plusCardBg: "#f8f8f8",
  plusCardBorder: "#e2e8f0",
  plusCardTitle: "#0f172a",
  plusCardHint: "#64748b",
  profileRowBg: "#ffffff",
  profileRowBorder: "#e2e8f0",
  profileRowActiveBg: "#f8fafc",
  profileRowActiveBorder: "#0f172a",
  backText: "#475569",

  // File name
  fileNameColor: "#1e293b",
  fileSizeColor: "#94a3b8",

  // Image placeholder
  imagePlaceholderBg: "#f1f5f9",
  imagePlaceholderText: "#94a3b8",

  // Streaming hint
  streamingHintText: "#94a3b8",

  // Finalized
  finalizedBorderColor: "rgba(0,0,0,0.06)",
  finalizedTextColor: "#374151",

  // TopBar
  topBarBg: "#f8f8f8",

  // Thread (overview)
  threadBg: "#ffffff",
  threadBorder: "rgba(0,0,0,0.08)",

  // Thread time
  threadTimeColor: "#9ca3af",

  // Intro
  introBg: "#faf9f7",
  introLogoRing: "#111827",
  introLogoInnerBorder: "#cbd5f5",
  introLogoInnerBg: "#f8fafc",
  introLogoText: "#0f172a",
};

export const darkColors: typeof lightColors = {
  // Surfaces
  surfaceMain: "#111111",
  surfaceSidebar: "#1a1a1a",
  surfacePanel: "#1e1e1e",
  appBg: "#111111",

  // Text
  textPrimary: "#f5f5f5",
  textSecondary: "#d1d5db",
  textMuted: "#6b7280",
  textHeading: "#f5f5f5",

  // Lines & Wash
  line: "rgba(255,255,255,0.08)",
  wash: "rgba(255,255,255,0.04)",

  // Interactive
  linkColor: "#60a5fa",
  buttonBg: "#f5f5f5",
  buttonText: "#111111",
  buttonDisabledBg: "#94a3b8",

  // Status
  statusRunning: "#3b82f6",
  statusOk: "#22c55e",
  statusFailed: "#ef4444",

  // Input
  inputBg: "transparent",
  inputBorder: "rgba(255,255,255,0.1)",
  inputFocusBorder: "rgba(255,255,255,0.3)",
  inputPlaceholder: "#6b7280",
  inputShellBg: "#1e1e1e",
  inputShellBorder: "rgba(255,255,255,0.08)",
  inputShellFocusBorder: "rgba(255,255,255,0.3)",
  inputText: "#f5f5f5",

  // Sidebar
  sidebarBg: "#1a1a1a",
  sidebarActiveItem: "rgba(255,255,255,0.06)",
  sidebarNewChatBg: "#333333",

  // Overlay
  overlayBg: "rgba(0,0,0,0.6)",

  // Attachment
  attachCardBg: "rgba(255,255,255,0.06)",
  attachCardBorder: "rgba(255,255,255,0.08)",
  attachFileBg: "#2a2a2a",

  // Error
  errorColor: "#f87171",
  errorBg: "rgba(239,68,68,0.1)",
  errorBorder: "rgba(239,68,68,0.3)",
  errorTitleColor: "#fca5a5",
  errorBodyColor: "#fca5a5",
  errorGhostBg: "rgba(239,68,68,0.1)",
  errorGhostBorder: "rgba(239,68,68,0.3)",

  // Auth specific
  authBg: "#111111",
  googleIconBg: "#222222",
  googleIconColor: "#f5f5f5",
  divider: "rgba(255,255,255,0.08)",
  dividerText: "rgba(255,255,255,0.4)",
  placeholder: "rgba(255,255,255,0.3)",
  consentText: "rgba(255,255,255,0.4)",
  secondaryBtnBorder: "rgba(255,255,255,0.12)",

  // Thinking panel
  thinkPanelBg: "rgba(99,102,241,0.1)",
  thinkPanelBorder: "rgba(99,102,241,0.2)",
  thinkPanelLabel: "#93c5fd",
  thinkPanelInline: "#d1d5db",
  thinkPanelSummary: "#9ca3af",
  thinkChipBg: "rgba(59,130,246,0.15)",
  thinkChipColor: "#93c5fd",
  thinkDeepChipBg: "#0f172a",
  thinkDeepChipColor: "#ffffff",

  // Chat
  userBubbleBg: "rgba(255,255,255,0.06)",
  userBubbleText: "#f5f5f5",
  suggestionBorder: "rgba(255,255,255,0.08)",
  closeTextColor: "#9ca3af",
  scrollBtnBg: "rgba(255,255,255,0.1)",
  scrollBtnText: "#d1d5db",

  // Message item
  systemBubbleBg: "rgba(99,102,241,0.08)",
  systemBubbleBorder: "rgba(99,102,241,0.3)",
  systemBubbleText: "#d1d5db",
  highlightBorder: "#f59e0b",
  highlightBg: "#fffbeb",

  // Icon buttons
  iconBtnBg: "rgba(255,255,255,0.08)",
  iconBtnText: "#f5f5f5",

  // Typing indicator dot
  typingDot: "#94a3b8",

  // Stream overlay inline fallback
  inlineFallbackText: "#d1d5db",

  // Drawer
  drawerBg: "#1a1a1a",
  drawerHandleIndicator: "rgba(255,255,255,0.15)",
  chunkCardBg: "rgba(255,255,255,0.04)",
  skeletonBg: "rgba(255,255,255,0.06)",
  summariesTitleColor: "#6b7280",

  // Plus panel
  plusCardBg: "#1e1e1e",
  plusCardBorder: "rgba(255,255,255,0.08)",
  plusCardTitle: "#f5f5f5",
  plusCardHint: "#6b7280",
  profileRowBg: "#1e1e1e",
  profileRowBorder: "rgba(255,255,255,0.08)",
  profileRowActiveBg: "#2a2a2a",
  profileRowActiveBorder: "#f5f5f5",
  backText: "#9ca3af",

  // File name
  fileNameColor: "#e2e8f0",
  fileSizeColor: "#6b7280",

  // Image placeholder
  imagePlaceholderBg: "#2a2a2a",
  imagePlaceholderText: "#6b7280",

  // Streaming hint
  streamingHintText: "#6b7280",

  // Finalized
  finalizedBorderColor: "rgba(255,255,255,0.06)",
  finalizedTextColor: "#d1d5db",

  // TopBar
  topBarBg: "#1a1a1a",

  // Thread (overview)
  threadBg: "#1b1b1b",
  threadBorder: "rgba(255,255,255,0.08)",

  // Thread time
  threadTimeColor: "#6b7280",

  // Intro
  introBg: "#111111",
  introLogoRing: "#f5f5f5",
  introLogoInnerBorder: "rgba(255,255,255,0.15)",
  introLogoInnerBg: "#1a1a1a",
  introLogoText: "#f5f5f5",
};

export type ThemeColors = typeof lightColors;

/* ==============================
   Fonts (unchanged from original)
============================== */

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
