export type SilenceReasonCode =
  | 'UNSAFE'
  | 'UNCERTAIN'
  | 'POLICY_BLOCK'
  | 'RESPONSIBILITY_LIMIT'
  | 'SCOPE_OUT';

export interface SilenceDecision {
  silent: true;
  reasonCode: SilenceReasonCode;
  responsibilityLevel: 'R4' | 'R5';
  messageForUser?: string; // 사용자에게 보여줄 최소 문구 (선택)
  internalNote?: string;   // 내부 감사용 설명
  timestamp: number;
}

export interface SilenceContext {
  requestId: string;
  userId?: string;
  workspaceId?: string;
  riskScore?: number;          // 0~1
  uncertaintyScore?: number;   // 0~1
  policyFlags?: string[];      // 상위 정책 신호
  scopeAllowed?: boolean;      // scope 판단 결과
}
