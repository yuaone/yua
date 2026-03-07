export interface MatchCode {
  id?: string;
  code: string;            // 6자리 코드
  userId: string;          // 유저 ID
  expertId?: string;       // 전문가 ID
  createdAt?: number;      // 생성 시간
  used: boolean;           // 사용 여부
  usedAt?: number | null;  // 사용 시간 (null 허용)
}
