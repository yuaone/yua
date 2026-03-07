# YUA Web Audit for Mobile Implementation Spec

> Generated from full source audit of `yua-web` (2026-03-05)
> This document is the single source of truth for building `yua-mobile` (Expo/React Native).

---

## Table of Contents

1. [Color Token Mapping](#1-color-token-mapping)
2. [Component Mapping](#2-component-mapping)
3. [Store Mapping](#3-store-mapping)
4. [Hook Mapping](#4-hook-mapping)
5. [API Call Inventory](#5-api-call-inventory)
6. [Screen List](#6-screen-list)
7. [Markdown Rendering Strategy](#7-markdown-rendering-strategy)
8. [Navigation Structure](#8-navigation-structure)
9. [Attachment / Image Handling](#9-attachment--image-handling)
10. [Streaming Strategy](#10-streaming-strategy)

---

## 1. Color Token Mapping

### 1.1 Core Tokens (Light)

| CSS Variable | Value | RN StyleSheet Key | RN Value |
|---|---|---|---|
| `--ink` | `#111827` | `colors.ink` | `'#111827'` |
| `--ink-2` | `#374151` | `colors.ink2` | `'#374151'` |
| `--line` | `#e5e7eb` | `colors.line` | `'#e5e7eb'` |
| `--wash` | `rgba(249,250,251,0.9)` | `colors.wash` | `'rgba(249,250,251,0.9)'` |
| `--app-bg` | `#ffffff` | `colors.appBg` | `'#ffffff'` |
| `--card-bg` | `#ffffff` | `colors.cardBg` | `'#ffffff'` |
| `--card-border` | `#e5e7eb` | `colors.cardBorder` | `'#e5e7eb'` |
| `--panel-bg` | `#f8fafc` | `colors.panelBg` | `'#f8fafc'` |
| `--muted` | `#64748b` | `colors.muted` | `'#64748b'` |
| `--surface-main` | `#ffffff` | `colors.surfaceMain` | `'#ffffff'` |
| `--surface-panel` | `#ffffff` | `colors.surfacePanel` | `'#ffffff'` |
| `--text-primary` | `var(--ink)` = `#111827` | `colors.textPrimary` | `'#111827'` |
| `--text-secondary` | `var(--ink-2)` = `#374151` | `colors.textSecondary` | `'#374151'` |
| `--text-muted` | `var(--muted)` = `#64748b` | `colors.textMuted` | `'#64748b'` |

### 1.2 Sidebar Tokens (Light)

| CSS Variable | Value | RN Key | RN Value |
|---|---|---|---|
| `--sb-bg` | `#F5F6F8` | `colors.sbBg` | `'#F5F6F8'` |
| `--sb-panel` | `#FFFFFF` | `colors.sbPanel` | `'#FFFFFF'` |
| `--sb-line` | `#E5E7EB` | `colors.sbLine` | `'#E5E7EB'` |
| `--sb-ink` | `#2B2F36` | `colors.sbInk` | `'#2B2F36'` |
| `--sb-ink-2` | `#6B7280` | `colors.sbInk2` | `'#6B7280'` |
| `--sb-soft` | `#E8EAEE` | `colors.sbSoft` | `'#E8EAEE'` |
| `--sb-active-bg` | `#DCE2FF` | `colors.sbActiveBg` | `'#DCE2FF'` |
| `--sb-active-ink` | `#2563EB` | `colors.sbActiveInk` | `'#2563EB'` |

### 1.3 Dark Mode Tokens

| CSS Variable | Dark Value | RN Key (dark) |
|---|---|---|
| `--app-bg` | `#1a1a1a` | `darkColors.appBg` |
| `--surface-main` | `#1a1a1a` | `darkColors.surfaceMain` |
| `--surface-panel` | `#202020` | `darkColors.surfacePanel` |
| `--surface-sidebar` | `#202020` | `darkColors.surfaceSidebar` |
| `--ink` | `rgba(255,255,255,0.9)` | `darkColors.ink` |
| `--ink-2` | `rgba(255,255,255,0.65)` | `darkColors.ink2` |
| `--muted` | `rgba(255,255,255,0.55)` | `darkColors.muted` |
| `--line` | `rgba(255,255,255,0.10)` | `darkColors.line` |
| `--wash` | `rgba(0,0,0,0.35)` | `darkColors.wash` |
| `--card-bg` | `#1b1b1b` | `darkColors.cardBg` |
| `--card-border` | `rgba(255,255,255,0.10)` | `darkColors.cardBorder` |
| `--text-primary` | `rgba(255,255,255,0.9)` | `darkColors.textPrimary` |
| `--text-secondary` | `rgba(255,255,255,0.65)` | `darkColors.textSecondary` |
| `--text-muted` | `rgba(255,255,255,0.55)` | `darkColors.textMuted` |
| `--sb-bg` | `#202020` | `darkColors.sbBg` |
| `--sb-ink` | `rgba(255,255,255,0.92)` | `darkColors.sbInk` |
| `--sb-ink-2` | `rgba(255,255,255,0.72)` | `darkColors.sbInk2` |
| `--sb-soft` | `rgba(255,255,255,0.06)` | `darkColors.sbSoft` |
| `--sb-active-bg` | `rgba(255,255,255,0.12)` | `darkColors.sbActiveBg` |
| `--sb-active-ink` | `rgba(255,255,255,0.92)` | `darkColors.sbActiveInk` |

### 1.4 Layout Constants

| CSS Variable | Value (Desktop) | Value (Mobile <640px) | Value (Tablet 768-1023px) |
|---|---|---|---|
| `--chat-max-w` | `960px` | `100%` | `720px` |
| `--chat-pad-x` | `18px` | `14px` | `18px` |

### 1.5 Typography Constants

| Element | Property | Value |
|---|---|---|
| body | fontSize | `16px` |
| body | lineHeight | `1.6` |
| `.assistant-bubble` | fontSize | `clamp(16.2px, 0.8vw + 13px, 19.5px)` -> RN: `16-17px` |
| `.assistant-bubble` | lineHeight | `1.75` |
| `.assistant-bubble strong` | fontWeight | `600` |
| User bubble | fontSize | `16px (mobile) / 18px (desktop)` |
| User bubble | lineHeight | `1.85` |
| Code block | fontSize | `15.6px` |
| Code block | lineHeight | `1.7` |
| Heading h1 | fontSize | `18.5px` |
| Heading h2 | fontSize | `18px` |
| Heading h3 | fontSize | `17.5px` |

### 1.6 Implementation: `constants/theme.ts`

```typescript
// Provide both light and dark color objects
// Use React Native's useColorScheme() or Appearance API
// Match html.dark class toggle with RN's scheme detection

export const lightColors = { /* all light values */ };
export const darkColors = { /* all dark values */ };

export function useYuaColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}
```

---

## 2. Component Mapping

### 2.1 Chat Components (39 files)

| Web Component | Path | Mobile Component | Notes |
|---|---|---|---|
| `ChatMain` | `chat/ChatMain.tsx` | `ChatScreen` | Full screen with FlatList + KeyboardAvoidingView. Props: `{ threadId: number }`. Manages scroll restore via `useRef` on FlatList. |
| `ChatOverview` | `chat/ChatOverview.tsx` | `ChatOverviewScreen` | Thread list + quick input. Shows recent threads (filtered by project), guest/authed states. |
| `ChatInput` | `chat/ChatInput.tsx` | `ChatInputBar` | TextInput + send/stop button + plus menu + attachment preview. Auto-grow textarea -> auto-grow TextInput (maxHeight 280). Props: `{ threadId, disabled, onSubmit? }`. Contains upload logic via `authFetch(\