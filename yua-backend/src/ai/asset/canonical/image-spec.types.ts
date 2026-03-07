// 🔒 IMAGE_SPEC v1 — SSOT FINAL (PHASE 4)

export type ImagePreset = "SQUARE" | "PRESENTATION" | "WIDE";

export type ImageStyleId =
  | "YUA_CORPORATE"
  | "YUA_DIAGRAM"
  | "YUA_MINIMAL";

export type ImageGenerationMode =
  | "GENERATE"
  | "TRANSFORM"
  | "COMPOSE";

/* --------------------------------------------------
 * Source Image
 * -------------------------------------------------- */

export interface ImageSource {
  type: "UPLOAD" | "REFERENCE";
  uri: string;
  role?: "BASE" | "OVERLAY" | "STYLE_REF";
}

/* --------------------------------------------------
 * Transform Operations
 * -------------------------------------------------- */

export type ImageTransformOp =
  | { type: "BACKGROUND_REMOVE" }
  | { type: "UPSCALE"; factor?: 2 | 4 }
  | { type: "COLOR_ADJUST"; preset?: "WARM" | "COOL" | "NEUTRAL" }
  | { type: "STYLE_TRANSFER"; styleId: ImageStyleId }
  | {
      type: "CROP";
      x: number;
      y: number;
      width: number;
      height: number;
    };

/* --------------------------------------------------
 * Compose Layout
 * -------------------------------------------------- */

export interface ComposeLayer {
  sourceIndex: number;

  x?: number;
  y?: number;

  width?: number;
  height?: number;

  opacity?: number; // 0~1
}

/* --------------------------------------------------
 * ImageSpec Root
 * -------------------------------------------------- */

export interface ImageSpec {
  schemaVersion: "v1";

  mode: ImageGenerationMode;

  /** GENERATE / COMPOSE */
  prompt?: string;

  /** TRANSFORM / COMPOSE */
  sourceImages?: ImageSource[];

  /** TRANSFORM */
  transforms?: ImageTransformOp[];

  /** COMPOSE */
  layout?: {
    canvas?: {
      width: number;
      height: number;
      background?: "LIGHT" | "DARK" | "TRANSPARENT";
    };
    layers: ComposeLayer[];
  };

  preset: ImagePreset;
  styleId: ImageStyleId;

  background: "LIGHT" | "DARK" | "TRANSPARENT";

  dpi: 72 | 144 | 300;
}
