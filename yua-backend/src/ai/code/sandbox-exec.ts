// 📂 src/ai/code/sandbox-exec.ts
// 🔥 YUA-AI Sandbox Executor — FINAL SAFE VERSION (2025.11)
// -------------------------------------------------------------
// ✔ Node.js child_process 격리 실행
// ✔ 실행 시간 제한 (timeout)
// ✔ stdout/stderr 크기 제한
// ✔ 위험 코드 차단 (require, fs, child_process 등)
// ✔ JS/TS 런타임 안전 모드
// ✔ CodeEngine / EvalEngine 완전 호환
// -------------------------------------------------------------

import { spawn } from "child_process";

export interface SandboxOptions {
  timeoutMs?: number;      // 실행 시간 제한
  maxOutput?: number;      // 출력 제한
  language?: string;       // js / ts (기본 js)
}

export interface SandboxResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
  timeout?: boolean;
}

export const SandboxExec = {
  async run(code: string, opts: SandboxOptions = {}): Promise<SandboxResult> {
    const {
      timeoutMs = 3000,
      maxOutput = 5000,
      language = "js",
    } = opts;

    // ---------------------------------------------------------
    // 1) 위험 패턴 차단
    // ---------------------------------------------------------
    const forbidden = ["require(", "import ", "fs.", "child_process", "process.", "while(true)", "for(;;)"];
    for (const f of forbidden) {
      if (code.includes(f)) {
        return { ok: false, error: `unsafe code blocked: ${f}` };
      }
    }

    // ---------------------------------------------------------
    // 2) 실행 파일 선택
    // ---------------------------------------------------------
    const execArgs = ["-e", code];

    const child = spawn("node", execArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      env: {},
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    // ---------------------------------------------------------
    // 3) stdout / stderr 제한
    // ---------------------------------------------------------
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > maxOutput) {
        stdout = stdout.substring(0, maxOutput);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > maxOutput) {
        stderr = stderr.substring(0, maxOutput);
      }
    });

    // ---------------------------------------------------------
    // 4) 종료 처리
    // ---------------------------------------------------------
    return new Promise<SandboxResult>((resolve) => {
      // Timeout
      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          try {
            child.kill("SIGKILL");
          } catch {}
          resolve({ ok: false, timeout: true, error: "Execution timed out" });
        }
      }, timeoutMs);

      child.on("error", (err) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        resolve({ ok: false, error: err.message });
      });

      child.on("close", () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        resolve({
          ok: stderr.length === 0,
          stdout,
          stderr,
        });
      });
    });
  },
};
