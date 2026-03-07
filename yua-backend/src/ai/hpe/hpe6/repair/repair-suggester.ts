import { HPE6Issue, HPE6Patch } from "../hpe6-protocol";

export function RepairSuggester(issues: HPE6Issue[]): HPE6Patch[] {
  return issues.map((i) => ({
    file: i.file ?? "unknown",
    suggestion: `Fix required for ${i.type}: ${i.detail}`,
    before: "",
    after: ""
  }));
}
