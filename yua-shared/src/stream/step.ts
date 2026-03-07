export type StepStatus = "RUNNING" | "OK" | "FAILED";

export type StepSource = {
  id: string;
  label: string;
  url: string;
  host?: string | null;
};

export type StepBlock = {
  id: string;
  groupIndex?: number;
  title: string;
  body?: string;
  sources?: StepSource[];
  status: StepStatus;
  meta?: Record<string, unknown>;
};
