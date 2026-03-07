// 📂 src/ai/engines/compute-engine.ts
// 🔥 YUA-AI ComputeEngine — FINAL ENTERPRISE VERSION (2025.11)
// ✔ JS / TS / Python 실행 지원
// ✔ SandboxExec 기반 안전 실행
// ✔ stdout / stderr 완전 분리
// ✔ WorkflowRunner "code" 노드 100% 호환

import { SandboxExec } from "../code/sandbox-exec";

export interface ComputeRunInput {
  language: string;
  code: string;
}

export interface ComputeRunOutput {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

export const ComputeEngine = {
  async run(input: ComputeRunInput): Promise<ComputeRunOutput> {
    const language = input.language?.toLowerCase() || "javascript";
    const code = input.code?.trim() || "";

    if (!code) {
      return { ok: false, error: "코드가 비어 있습니다." };
    }

    try {
      const result = await SandboxExec.run(code, { language });

      return {
        ok: true,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || String(err),
      };
    }
  },
};
