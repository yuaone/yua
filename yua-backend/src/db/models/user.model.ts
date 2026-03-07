export interface UserProfile {
  id?: string;     // Firestore document ID
  userId: string;  // Firebase Auth UID or internal UID

  // 사용자 구분
  userType:
    | "employee"
    | "business"
    | "corporate"
    | "tax_agent"
    | "tax_firm"
    | "accounting_firm";

  // 자동 시간 기록 (repo에서 생성)
  createdAt?: number;

  // optional user info (확장용)
  name?: string;
  email?: string;
  phone?: string;

  // 사업자/법인용 확장 필드
  businessNumber?: string;   // 개인사업자/법인용
  companyName?: string;
}
