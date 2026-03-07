// 🔒 YUA Metadata Types — PHASE 12-9-5 SSOT
// --------------------------------------
// 판단/텍스트/의미 정보 ❌
// 운영 메타데이터 ONLY

export type MetadataCategory =
  | "JUDGMENT_OUTCOME"
  | "FAILURE_SIGNAL"
  | "UNCERTAINTY_SIGNAL"
  | "VERIFIER_STATS"
  | "IMPLICIT_BEHAVIOR"
  | "TEMPORAL_STABILITY";

export type MetadataPayload =
  | {
      task_class: string;
      path_selected: string;
      confidence_bucket: "low" | "mid" | "high";
      collapsed: boolean;
    }
  | {
      failure_type: string;
      severity: "low" | "mid" | "high";
      incident_mode: boolean;
    }
  | {
      uncertainty_level: "low" | "mid" | "high";
      verifier_disagreement: boolean;
    }
  | {
      verifier_id: string;
      success_rate: number;
      avg_latency_ms: number;
    }
  | {
      followup_count: number;
      retry: boolean;
      session_abandoned: boolean;
    }
  | {
      signal_frequency: "rare" | "normal" | "frequent";
      signal_recency: "low" | "mid" | "high";
    };

export interface MetadataEvent {
  workspaceId: string;
  category: MetadataCategory;
  payload: MetadataPayload;
  createdAt?: Date;
}
