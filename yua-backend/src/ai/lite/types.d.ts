// 📂 src/ai/lite/types.d.ts
// 🔥 YUA-Lite Types — FINAL STABLE BUILD (ERROR-FREE VERSION)

export interface AOSSResult {
  safe: boolean;
  cleaned: string;
  riskScore: number;
}

export interface Scenario {
  agent: string;
  text: string;
  valueScore: number;
  riskScore: number;
  finalScore: number;
}

export interface HPEOutput {
  stabilized: string;
  confidence: number;

  /** HPE 원본 텍스트 */
  output?: string;
}

export interface LiteMetadata {
  aoss: AOSSResult;
  fsle: Scenario;
  hpe: HPEOutput;
  stableConfidence: number;
  riskFactor: number;
    vkrHints?: {
    summary: string;
    relevance: number;
    source: {
      url: string;
      domain: string;
      title?: string;
      license: string;
    };
  }[];
}

/* -----------------------------------------------------------
   LitePipelineOutput (통합 표준)
   - chat-engine, chat-router, pipeline-lite 모두 호환
   - blocked: optional
   - reply: optional
   ----------------------------------------------------------- */
export interface LitePipelineOutput {
  ok: boolean;
  cleaned: string;
  metadata: LiteMetadata;
  internalSignal: string;

  blocked?: boolean;
  reply?: string;
  reason?: string;
}

/* -----------------------------------------------------------
   LoggingPayload / MetaInfo — controller 오류 제거
   ----------------------------------------------------------- */
export interface LoggingPayload {
  [key: string]: any;
  litePipeline?: LiteMetadata;
  superadmin?: boolean;
}

export interface MetaInfo {
  [key: string]: any;
  liteMeta?: LiteMetadata;
}
