export interface SecurityStreamEvent {
  type:
    | "security"
    | "sensor"
    | "video"
    | "gesture"
    | "ai"
    | "system"
    | "custom";

  message: string;

  source?: string;
  userId?: string;

  risk?: number;
  severity?: "low" | "medium" | "high" | "critical";

  data?: any;
  meta?: any;

  timestamp?: string;
}
