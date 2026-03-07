export interface RiskRecord {
  id?: string;        // Firestore document ID
  userId: string;     // 유저 ID

  // RiskEngine 결과
  riskScore: number;  // 0~100 또는 0~10 등 스코어 시스템
  flagged: boolean;   // 위험 탐지 여부

  // AI 엔진에서 생성한 상세 분석 메시지
  message: string;

  // 유저가 입력한 원본 텍스트 (예: "내 소비패턴 분석해줘")
  input?: string;

  // raw AI 결과 저장 (원할 때)
  result?: any;

  // 시간 자동 생성
  createdAt?: number;
}
