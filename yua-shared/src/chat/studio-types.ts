/**
 * 🔒 Studio / Asset System Message SSOT
 * - system message → studio → section 단일 연결
 * - assetId 개념 제거 (sectionId가 유일 anchor)
 */

export type StudioAssetType =
  | "DOCUMENT"
  | "IMAGE"
  | "VIDEO"
  | "SEMANTIC_IMAGE"
  | "FACTUAL_VISUALIZATION"
  | "COMPOSITE_IMAGE";

export type StudioSystemRef = {
  sectionId: number;
  assetType: StudioAssetType;
};