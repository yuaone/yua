export interface HPE6Issue {
  type: string;
  file?: string;
  detail: string;
  severity: "low" | "medium" | "high";
}

export interface HPE6Patch {
  file: string;
  before?: string;
  after?: string;
  suggestion: string;
}

export interface HPE6Output {
  ok: boolean;
  issues: HPE6Issue[];
  patches: HPE6Patch[];
}
