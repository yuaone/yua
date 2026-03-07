import { spawn } from "child_process";
import type { DecisionDomain } from "../decision-assistant/decision-domain";

export type PySolverRequest = {
  traceId: string;
  query: string;
  domain: DecisionDomain;               // ✅ SSOT
  options?: Record<string, unknown>;
};

export type PySolverResponse = {
  ok: boolean;
  result?: unknown;
  meta?: {
    engine: string;
    solver: string;
    latencyMs: number;
  };
  error?: string;
};

const PYTHON_BIN = "venv/bin/python";
const ENTRY = "src/py/solver/main.py";
const DOC_ENTRY = "src/py/document/builder.py";
const TIMEOUT_MS = 8000;

export function runPySolver(
  req: PySolverRequest
): Promise<PySolverResponse> {
  return new Promise((resolve, reject) => {
        const entry =
      (req as any).document === true ? DOC_ENTRY : ENTRY;

    const proc = spawn(PYTHON_BIN, [entry], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("PY_SOLVER_TIMEOUT"));
    }, TIMEOUT_MS);

    let out = "";
    let err = "";

    proc.stdout.on("data", d => (out += d.toString()));
    proc.stderr.on("data", d => {
      // 🔎 DEBUG LOG ONLY (DO NOT FAIL)
      err += d.toString();
    });

    proc.on("close", () => {
      clearTimeout(timer);
      // 🔒 실패 조건은 stdout 파싱 실패만
      try {
        const parsed = JSON.parse(out);
        resolve(parsed);
      } catch (e) {
        reject(
          new Error(
            `[PY_SOLVER_JSON_PARSE_FAIL]\nstdout:\n${out}\nstderr:\n${err}`
          )
        );
      }
    });  

    proc.stdin.write(JSON.stringify(req));
    proc.stdin.end();
  });
}
