// 🔒 SSOT: EvidenceSignal — Search/Research 결과를 '신호'로만 표현

export interface EvidenceSignal {
  source: "search" | "research";
  attempted: boolean;
  documentCount: number;
  trustedCount: number;
  avgTrustScore: number;
}
