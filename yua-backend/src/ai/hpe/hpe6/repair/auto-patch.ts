import { HPE6Issue, HPE6Patch } from "../hpe6-protocol";

export function AutoPatch(issues: HPE6Issue[]): HPE6Patch[] {
  return issues.map((i) => ({
    file: i.file ?? "unknown",
    suggestion: `Auto-patch available for ${i.type}`,
    before: "",
    after: ""
  }));
}
