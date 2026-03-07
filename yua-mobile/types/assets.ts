export type MobileImageAssetType =
  | "COMPOSITE_IMAGE"
  | "FACTUAL_VISUALIZATION"
  | "SEMANTIC_IMAGE"
  | string;

export type MobilePhotoAsset = {
  id: number;
  sectionId: number;
  assetType: MobileImageAssetType;
  uri: string;
  createdAt: number | null;
  threadId: number | null;
  documentId: number | null;
};
