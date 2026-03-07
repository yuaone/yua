export type YuaToolResult<T = unknown> = {
  status: "OK" | "PARTIAL" | "ERROR";
  output?: T;

  provenance: {
    inputsHash: string;
    toolVersion: string;
    startedAt: number;
    endedAt: number;
    sources?: {
      kind: "FILE" | "WEB" | "DB" | "API" | "MEMORY";
      ref: string;
    }[];
    cache?: {
      hit: boolean;
      key: string;
    };
  };

  metrics?: {
    rows?: number;
    cols?: number;
    tables?: number;
    pages?: number;
    latencyMs?: number;
    costUnits?: number;
  };

  warnings?: string[];
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
};
