// src/ai/asset/execution/image/image-presets.ts
// 🔒 Image Presets — SSOT (PHASE 1 FIXED)

export const IMAGE_PRESETS = {
  SQUARE: {
    width: 1024,
    height: 1024,
    dpiSafe: true,
    printReady: false,
  },

  PRESENTATION: {
    width: 1920,
    height: 1080,
    dpiSafe: true,
    printReady: true,
  },

  WIDE: {
    width: 2560,
    height: 1440,
    dpiSafe: true,
    printReady: true,
  },
} as const;

export type ImagePresetKey = keyof typeof IMAGE_PRESETS;
