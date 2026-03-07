export interface ReportData {
  id?: string;
  userId: string;

  // 리포트 유형
  reportType: "tax" | "finance" | "corporate";

  // 유저 입력 (예: "내 지난달 지출 분석해줘")
  input: string;

  // AI가 생성한 리포트 결과
  aiResult: string;

  // 선택적: 리스크 스코어 포함 가능
  riskScore?: number;

  // Firestore 자동 생성
  createdAt?: number;
}
