// 🔒 YUA Memory Versioning Guard — PHASE 12-1 SSOT
// ------------------------------------------------
// 목적:
// - memory_records 직접 수정/삭제 방지
// - workspace_id 강제
// - 모든 변경은 Log 기반만 허용
// ------------------------------------------------


export class MemoryVersioningViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemoryVersioningViolation";
  }
}

export function assertWorkspaceId(
  workspaceId: string | null | undefined
): void {
  if (!workspaceId) {
    throw new MemoryVersioningViolation(
      "workspace_id is required for all memory operations"
    );
  }
}


export function assertNoDirectMutation(action: string) {
  const forbidden = ["delete", "overwrite", "direct_update"];

  if (forbidden.includes(action)) {
    throw new MemoryVersioningViolation(
      `Direct mutation "${action}" on memory_records is forbidden (PHASE 12-1)`
    );
  }
}
