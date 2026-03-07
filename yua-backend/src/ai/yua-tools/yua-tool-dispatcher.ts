import { createHash, randomUUID } from "crypto";
import path from "path";
import type { YuaExecutionPlan, YuaToolResult } from "yua-shared";
import { writeRawEvent } from "../telemetry/raw-event-writer";
import { runPySolver } from "../tools/py-solver-runner";
import { runDirectUrlFetch } from "../tools/direct-url-fetch"
import {
  createPlanned,
  findCachedFinished,
  markError,
  markFinished,
  markRunning,
} from "./yua-tool-run-store";
import type { YuaToolRunRecord } from "./yua-tool-run.types";
import {
  runTableExtraction,
  computeTableInputsHash,
  type TableExtractionPayload,
} from "./yua-table-extractor";
import {
  runDataTransform,
  computeDataTransformInputsHash,
  type DataTransformPayload,
} from "./yua-data-transformer";
import {
  runFileAnalysis,
  computeFileInputsHash,
  type FileAnalysisPayload,
} from "./yua-file-analyzer";

const TOOL_VERSION = "0.2.0";

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function now() {
  return Date.now();
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

const UPLOADS_API_PREFIX = "/api/assets/uploads/";
const UPLOADS_LOCAL_PREFIX = "/mnt/yua/assets/uploads/";


function resolveToLocalPath(p: string): string {
  // GCS upload URL → local mirror path
  // example:
  // https://storage.googleapis.com/yua-chat-uploads/chat/abc.zip
  if (p.startsWith("https://storage.googleapis.com/")) {
    const m = p.match(/yua-chat-uploads\/(.+)$/);
    if (m) {
      const relative = m[1]; // chat/abc.zip
      return path.resolve("/mnt/yua", relative);
    }
  }

  // /api/assets/uploads/... → /mnt/yua/assets/uploads/...
  if (p.startsWith(UPLOADS_API_PREFIX)) {
    if (p.includes("..")) {
      throw new Error("FILE_ANALYSIS normalization failed: invalid uploads path");
    }
    return p.replace(UPLOADS_API_PREFIX, UPLOADS_LOCAL_PREFIX);
  }

  // http(s)://host/api/assets/uploads/... → /mnt/yua/assets/uploads/...
  if (p.startsWith("http://") || p.startsWith("https://")) {
    const url = new URL(p);
    const { pathname } = url;
    if (pathname.startsWith(UPLOADS_API_PREFIX)) {
      if (pathname.includes("..")) {
        throw new Error("FILE_ANALYSIS normalization failed: invalid uploads path");
      }
      return pathname.replace(UPLOADS_API_PREFIX, UPLOADS_LOCAL_PREFIX);
    }
    throw new Error("FILE_ANALYSIS normalization failed: unsupported file URL");
  }

  return p;
}

function normalizeFileAnalysisPayload(raw: unknown): FileAnalysisPayload {
  const r = (raw && typeof raw === "object") ? (raw as Record<string, unknown>) : {};

  const filePathsFromPayload = Array.isArray(r.filePaths)
    ? r.filePaths.filter(isString)
    : [];

  const filePathsFromAttachments = Array.isArray(r.attachments)
    ? r.attachments
        .filter(
          (a) =>
            a &&
            typeof a === "object" &&
            (a as any).kind === "file" &&
            (typeof (a as any).url === "string" ||
              typeof (a as any).fileUrl === "string")
        )
        .map((a) => ((a as any).url ?? (a as any).fileUrl) as string)
    : [];

  const filePaths =
    filePathsFromPayload.length > 0
      ? filePathsFromPayload
      : filePathsFromAttachments;

  if (!filePaths || filePaths.length === 0) {
    throw new Error(
      "FILE_ANALYSIS normalization failed: no file paths resolved"
    );
  }

   const resolvedFilePaths = filePaths.map(resolveToLocalPath);

  const profile =
    r.profile === "QUICK" || r.profile === "NORMAL" || r.profile === "AUDIT"
      ? r.profile
      : undefined;

  const goals = Array.isArray(r.goals)
    ? (r.goals.filter((g) =>
        g === "summary" || g === "types" || g === "stats" || g === "outliers" || g === "trend"
      ) as FileAnalysisPayload["goals"])
    : undefined;

  const maxRowsSample = typeof r.maxRowsSample === "number" ? r.maxRowsSample : undefined;
  const maxBytes = typeof r.maxBytes === "number" ? r.maxBytes : undefined;

  return { filePaths: resolvedFilePaths, profile, goals, maxRowsSample, maxBytes };
}

function toErrorResult(
  inputsHash: string,
  startedAt: number,
  endedAt: number,
  e: any
): YuaToolResult<any> {
  const message = e?.message ?? String(e);
  return {
    status: "ERROR",
    provenance: {
      inputsHash,
      toolVersion: TOOL_VERSION,
      startedAt,
      endedAt,
      sources: [],
    },
    error: {
      code: "TOOL_EXECUTION_ERROR",
      message,
      retryable: false,
    },
  };
}

async function emitToolEvent(params: {
  traceId: string;
  workspaceId: string;
  threadId?: number;
  status: "planned" | "running" | "finished" | "error" | "cached";
  task: string;
  toolRunId: string;
  inputsHash: string;
}) {
  await writeRawEvent({
    traceId: params.traceId,
    threadId: params.threadId,
    workspaceId: params.workspaceId,
    actor: "TOOL",
    eventKind: "tool_call",
    phase: "execution",
    payload: {
      status: params.status,
      task: params.task,
      toolRunId: params.toolRunId,
      inputsHash: params.inputsHash,
    },
  });
}

export async function dispatchYuaExecutionPlan(
  plan: YuaExecutionPlan,
  context: { traceId: string; workspaceId: string; threadId?: number }
): Promise<{ toolRunId: string; result: YuaToolResult<any> }> {
  const { traceId, workspaceId, threadId } = context;
  const task = (plan as any).task as string;

  // ✅ FILE_ANALYSIS: realInputsHash(파일해시 포함) 기준 캐시
  if (plan.task === "FILE_ANALYSIS") {
    const payload = normalizeFileAnalysisPayload(plan.payload);

    const startedAt = now();

    // 1️⃣ 먼저 해시만 계산
    const { inputsHash: realInputsHash } =
      await computeFileInputsHash(payload);

    // 2️⃣ realInputsHash 기준 캐시 조회
    const cached = await findCachedFinished({
      workspaceId,
      task: plan.task,
      inputsHash: realInputsHash,
      toolVersion: TOOL_VERSION,
    });

    if (cached?.result) {
      await emitToolEvent({
        traceId,
        workspaceId,
        threadId,
        status: "cached",
        task: plan.task,
        toolRunId: cached.id,
        inputsHash: realInputsHash,
      });

      return { toolRunId: cached.id, result: cached.result };
    }

    // 3️⃣ 캐시 miss → 이제 실제 분석 실행
    const r = await runFileAnalysis(payload);

    // 2) 캐시 miss → 신규 run
    const toolRunId = randomUUID();
    const endedAt = now();

    const result: YuaToolResult<any> = {
      status: r.warnings.length ? "PARTIAL" : "OK",
      output: r.output,
      provenance: {
        inputsHash: realInputsHash,
        toolVersion: TOOL_VERSION,
        startedAt,
        endedAt,
        sources: r.sources,
        cache: { hit: false, key: `${plan.task}:${realInputsHash}:${TOOL_VERSION}` },
      },
      metrics: {
        rows: r.metrics.rows,
        cols: r.metrics.cols,
        latencyMs: endedAt - startedAt,
      },
      warnings: r.warnings.length ? r.warnings : undefined,
    };

    const record: YuaToolRunRecord = {
      id: toolRunId,
      traceId,
      threadId,
      workspaceId,
      task: plan.task,
      status: "planned",
      inputsHash: realInputsHash,
      toolVersion: TOOL_VERSION,
      createdAt: startedAt,
      startedAt,
      finishedAt: endedAt,
      result,
    };

    // planned → running → finished 이벤트/DB (SSOT: tool_runs)
    await createPlanned(record);

    await emitToolEvent({
      traceId,
      workspaceId,
      threadId,
      status: "planned",
      task: plan.task,
      toolRunId,
      inputsHash: realInputsHash,
    });

    await markRunning(toolRunId, startedAt);

    await emitToolEvent({
      traceId,
      workspaceId,
      threadId,
      status: "running",
      task: plan.task,
      toolRunId,
      inputsHash: realInputsHash,
    });

    await markFinished(toolRunId, result, endedAt);

    await emitToolEvent({
      traceId,
      workspaceId,
      threadId,
      status: "finished",
      task: plan.task,
      toolRunId,
      inputsHash: realInputsHash,
    });

    return { toolRunId, result };
  }

  if (plan.task === "TABLE_EXTRACTION") {
    const payload = plan.payload as TableExtractionPayload;
    const startedAt = now();
    const { inputsHash } = await computeTableInputsHash(payload);

    const cached = await findCachedFinished({
      workspaceId,
      task: plan.task,
      inputsHash,
      toolVersion: TOOL_VERSION,
    });
    if (cached?.result) {
      await emitToolEvent({
        traceId,
        workspaceId,
        threadId,
        status: "cached",
        task: plan.task,
        toolRunId: cached.id,
        inputsHash,
      });
      return { toolRunId: cached.id, result: cached.result };
    }

    const toolRunId = randomUUID();
    await createPlanned({
      id: toolRunId,
      traceId,
      threadId,
      workspaceId,
      task: plan.task,
      status: "planned",
      inputsHash,
      toolVersion: TOOL_VERSION,
      createdAt: startedAt,
    });

    await emitToolEvent({
      traceId,
      workspaceId,
      threadId,
      status: "planned",
      task: plan.task,
      toolRunId,
      inputsHash,
    });

    await markRunning(toolRunId, startedAt);
    await emitToolEvent({
      traceId,
      workspaceId,
      threadId,
      status: "running",
      task: plan.task,
      toolRunId,
      inputsHash,
    });

    const { output, artifactUris, warnings } = await runTableExtraction(toolRunId, payload);

    const endedAt = now();

    const toolResult: YuaToolResult<any> = {
      status: warnings?.length ? "PARTIAL" : "OK",
      output,
      provenance: {
        inputsHash,
        toolVersion: TOOL_VERSION,
        startedAt,
        endedAt,
        sources: [
          { kind: "FILE" as const, ref: payload.filePath },
          ...artifactUris.map((u) => ({ kind: "FILE" as const, ref: u })),
        ],
        cache: { hit: false, key: `${plan.task}:${inputsHash}:${TOOL_VERSION}` },
      },
      metrics: {
        tables: output.tables.length,
        latencyMs: endedAt - startedAt,
      },
      warnings: warnings?.length ? warnings : undefined,
    };

    await markFinished(toolRunId, toolResult, endedAt);

    await emitToolEvent({
      traceId,
      workspaceId,
      threadId,
      status: "finished",
      task: plan.task,
      toolRunId,
      inputsHash,
    });

    return { toolRunId, result: toolResult };
  }
  if (plan.task === "DATA_TRANSFORM") {
    const payload = plan.payload as DataTransformPayload;
    const startedAt = now();
    const { inputsHash } = await computeDataTransformInputsHash(payload);

    const cached = await findCachedFinished({
      workspaceId,
      task: plan.task,
      inputsHash,
      toolVersion: TOOL_VERSION,
    });
    if (cached?.result) {
      await emitToolEvent({
        traceId,
        workspaceId,
        threadId,
        status: "cached",
        task: plan.task,
        toolRunId: cached.id,
        inputsHash,
      });
      return { toolRunId: cached.id, result: cached.result };
    }

    const toolRunId = randomUUID();
    await createPlanned({
      id: toolRunId,
      traceId,
      threadId,
      workspaceId,
      task: plan.task,
      status: "planned",
      inputsHash,
      toolVersion: TOOL_VERSION,
      createdAt: startedAt,
    });

    await emitToolEvent({
      traceId,
      workspaceId,
      threadId,
      status: "planned",
      task: plan.task,
      toolRunId,
      inputsHash,
    });

    await markRunning(toolRunId, startedAt);
    await emitToolEvent({
      traceId,
      workspaceId,
      threadId,
      status: "running",
      task: plan.task,
      toolRunId,
      inputsHash,
    });

    try {
      const { output, artifactUris, sources, metrics, warnings } = await runDataTransform(toolRunId, payload);
      const endedAt = now();

      const toolResult: YuaToolResult<any> = {
        status: warnings?.length ? "PARTIAL" : "OK",
        output,
        provenance: {
          inputsHash,
          toolVersion: TOOL_VERSION,
          startedAt,
          endedAt,
          sources: [
            ...(sources ?? []),
            ...artifactUris.map((u) => ({ kind: "FILE" as const, ref: u })),
          ],
          cache: { hit: false, key: `${plan.task}:${inputsHash}:${TOOL_VERSION}` },
        },
        metrics: { ...(metrics ?? {}), latencyMs: endedAt - startedAt },
        warnings: warnings?.length ? warnings : undefined,
      };

      await markFinished(toolRunId, toolResult, endedAt);
      await emitToolEvent({
        traceId,
        workspaceId,
        threadId,
        status: "finished",
        task: plan.task,
        toolRunId,
        inputsHash,
      });

      return { toolRunId, result: toolResult };
    } catch (e: any) {
      const endedAt = now();
      const err = toErrorResult(inputsHash, startedAt, endedAt, e);
      await markError(toolRunId, err, endedAt);
      await emitToolEvent({
        traceId,
        workspaceId,
        threadId,
        status: "error",
        task: plan.task,
        toolRunId,
        inputsHash,
      });
      return { toolRunId, result: err };
    }
  }

  if (task === "PY_SOLVER" || task === "MARKET_DATA") {
    const toolRunId = randomUUID();
    const createdAt = now();
    const startedAt = createdAt;
    const inputsHash = sha256Hex(JSON.stringify(plan.payload ?? {}));

    await createPlanned({
      id: toolRunId,
      traceId,
      threadId,
      workspaceId,
      task: plan.task,
      status: "planned",
      inputsHash,
      toolVersion: TOOL_VERSION,
      createdAt,
    });

    await emitToolEvent({
      traceId,
      workspaceId,
      threadId,
      status: "planned",
      task: plan.task,
      toolRunId,
      inputsHash,
    });

    await markRunning(toolRunId, startedAt);
    await emitToolEvent({
      traceId,
      workspaceId,
      threadId,
      status: "running",
      task: plan.task,
      toolRunId,
      inputsHash,
    });

    try {
      const solver = await runPySolver({
        traceId,
        ...(plan.payload as any),
      });

      const endedAt = now();

      const result: YuaToolResult<any> =
        solver.ok
          ? {
              status: "OK",
              output: solver,
              provenance: {
                inputsHash,
                toolVersion: TOOL_VERSION,
                startedAt,
                endedAt,
                sources: [],
                cache: { hit: false, key: `${plan.task}:${inputsHash}:${TOOL_VERSION}` },
              },
              metrics: { latencyMs: endedAt - startedAt },
            }
          : {
              status: "ERROR",
              output: solver,
              provenance: {
                inputsHash,
                toolVersion: TOOL_VERSION,
                startedAt,
                endedAt,
                sources: [],
                cache: { hit: false, key: `${plan.task}:${inputsHash}:${TOOL_VERSION}` },
              },
              error: {
                code: "PY_SOLVER_ERROR",
                message: solver.error ?? "PY_SOLVER_FAILED",
                retryable: false,
              },
            };

      if (result.status === "ERROR") {
        await markError(toolRunId, result, endedAt);
      } else {
        await markFinished(toolRunId, result, endedAt);
      }

      await emitToolEvent({
        traceId,
        workspaceId,
        threadId,
        status: result.status === "ERROR" ? "error" : "finished",
        task: plan.task,
        toolRunId,
        inputsHash,
      });

      return { toolRunId, result };
    } catch (e: any) {
      const endedAt = now();
      const err = toErrorResult(inputsHash, startedAt, endedAt, e);
      await markError(toolRunId, err, endedAt);
      await emitToolEvent({
        traceId,
        workspaceId,
        threadId,
        status: "error",
        task: plan.task,
        toolRunId,
        inputsHash,
      });
      return { toolRunId, result: err };
    }
  }
  if (task === "DIRECT_URL_FETCH") {
    const toolRunId = randomUUID();
    const createdAt = now();
    const startedAt = createdAt;
    const inputsHash = sha256Hex(JSON.stringify(plan.payload ?? {}));

    await createPlanned({
      id: toolRunId,
      traceId,
      threadId,
      workspaceId,
      task: plan.task,
      status: "planned",
      inputsHash,
      toolVersion: TOOL_VERSION,
      createdAt,
    });

    await emitToolEvent({
      traceId,
      workspaceId,
      threadId,
      status: "planned",
      task: plan.task,
      toolRunId,
      inputsHash,
    });

    await markRunning(toolRunId, startedAt);

    try {

      const fetchResult = await runDirectUrlFetch(plan.payload as any);


      const endedAt = now();
      if (fetchResult.status !== "OK" || !fetchResult.output) {
        const err: YuaToolResult<any> = {
          status: "ERROR",
          provenance: {
            inputsHash,
            toolVersion: TOOL_VERSION,
            startedAt,
            endedAt,
            sources: [],
          },
          error: {
            code: "DIRECT_URL_FETCH_FAILED",
            message: (fetchResult as any)?.error ?? "UNKNOWN_ERROR",
            retryable: false,
          },
        };

        await markError(toolRunId, err, endedAt);
        return { toolRunId, result: err };
      }
      const toolResult: YuaToolResult<any> = {
        status: "OK",
        output: fetchResult.output,
        provenance: {
          inputsHash,
          toolVersion: TOOL_VERSION,
          startedAt,
          endedAt,
          sources: (fetchResult.output.documents ?? [])
            .slice(0, 5)
            .map((d: any) => ({
              kind: "WEB" as const,
              ref: d.url,
            })),
          cache: { hit: false, key: `${plan.task}:${inputsHash}:${TOOL_VERSION}` },
        },
        metrics: { latencyMs: endedAt - startedAt },
      };

      await markFinished(toolRunId, toolResult, endedAt);

      return { toolRunId, result: toolResult };
    } catch (e: any) {
      const endedAt = now();
      const err = toErrorResult(inputsHash, startedAt, endedAt, e);
      await markError(toolRunId, err, endedAt);
      return { toolRunId, result: err };
    }
  }
  // ✅ OTHER TASKS: payload hash 기준 (stub 유지)
  const toolRunId = randomUUID();
  const createdAt = now();
  const startedAt = createdAt;

  const inputsHash = sha256Hex(JSON.stringify(plan.payload ?? {}));

  const plannedRecord: YuaToolRunRecord = {
    id: toolRunId,
    traceId,
    threadId,
    workspaceId,
    task: plan.task,
    status: "planned",
    inputsHash,
    toolVersion: TOOL_VERSION,
    createdAt,
  };

  await createPlanned(plannedRecord);

  await emitToolEvent({
    traceId,
    workspaceId,
    threadId,
    status: "planned",
    task: plan.task,
    toolRunId,
    inputsHash,
  });

  await markRunning(toolRunId, startedAt);

  await emitToolEvent({
    traceId,
    workspaceId,
    threadId,
    status: "running",
    task: plan.task,
    toolRunId,
    inputsHash,
  });

  try {
    // TODO: task별 실제 실행기로 교체 예정. 지금은 stub.
    const endedAt = now();

    const result: YuaToolResult<any> = {
      status: "OK",
      output: { stub: true },
      provenance: {
        inputsHash,
        toolVersion: TOOL_VERSION,
        startedAt,
        endedAt,
        sources: [],
        cache: { hit: false, key: `${plan.task}:${inputsHash}:${TOOL_VERSION}` },
      },
      metrics: { latencyMs: endedAt - startedAt },
    };

    await markFinished(toolRunId, result, endedAt);

    await emitToolEvent({
      traceId,
      workspaceId,
      threadId,
      status: "finished",
      task: plan.task,
      toolRunId,
      inputsHash,
    });

    return { toolRunId, result };
  } catch (e: any) {
    const endedAt = now();
    const err = toErrorResult(inputsHash, startedAt, endedAt, e);

    await markError(toolRunId, err, endedAt);

    await emitToolEvent({
      traceId,
      workspaceId,
      threadId,
      status: "error",
      task: plan.task,
      toolRunId,
      inputsHash,
    });

    return { toolRunId, result: err };
  }
}
