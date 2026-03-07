// 🔒 Business Domain Types (SSOT)

export type BusinessOCRResult = {
  businessNumber: string;
  name: string;
  type: string;
  rawImage: string;
};

export type BusinessProfile = {
  user_id: string;
  business_number: string;
  name: string;
  type: string;
  created_at: number;
  updated_at: number;
};
