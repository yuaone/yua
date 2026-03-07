import {
  redisPub,
  titleJobStreamKey,
  titlePatchChannel,
  threadTitleJobStreamKey
} from "../../db/redis";

import crypto from "crypto";

export type ActivityTitleJob = {
  threadId: number;
  traceId: string;
  activityId: string;
  kind: string;
  body: string;
  hint?: string;
  sources?: Array<{
    id?: string;
    label?: string;
    url: string;
    host?: string | null;
  }>;
  jobType?: "activity";
};

// scale-out safe: 중복 enqueue 방지 락
function jobLockKey(activityId: string) {
  return `yua:activity_title:lock:${activityId}`;
}

export async function enqueueActivityTitleJob(job: ActivityTitleJob) {
  // ✅ 1) activityId 단위로 1회만 enqueue (TTL 10분)
  const lock = jobLockKey(job.activityId);
  const ok = await redisPub.set(lock, "1", "EX", 60 * 10, "NX");
  if (ok !== "OK") return;

  // ✅ 2) Redis Stream enqueue
  const stream = titleJobStreamKey();
  console.debug("[TITLE_JOB_ENQUEUE]", {
    activityId: job.activityId,
    title: job.body?.slice(0, 80),
  });
  await redisPub.xadd(
    stream,
    "*",
    "threadId",
    String(job.threadId),
    "traceId",
    job.traceId,
    "activityId",
    job.activityId,
    "kind",
    job.kind,
    "body",
    job.body,
    "hint",
    job.hint ?? "",
    "sources",
    JSON.stringify(job.sources ?? [])
  );
}

// --------------------------------------------------
// 🔥 Thread Sidebar Title Enqueue
// --------------------------------------------------

export async function enqueueThreadTitleJob(args: {
  threadId: number;
  workspaceId: string;
  body: string;
  traceId?: string;
}) {
  const lock = `yua:thread_title:lock:${args.threadId}`;
  const ok = await redisPub.set(lock, "1", "EX", 60 * 10, "NX");
  if (ok !== "OK") return;

  const stream = threadTitleJobStreamKey();
  await redisPub.xadd(
    stream,
    "*",
    "threadId",
    String(args.threadId),
    "workspaceId",
    args.workspaceId,
    "body",
    args.body,
    "traceId",
  args.traceId ?? ""
  );
}

// Worker가 publish할 때 쓰는 채널 helper (직접 publish도 가능)
export async function publishTitlePatch(args: {
  threadId: number;
  traceId: string;
  activityId: string;
  title: string;
}) {
  const ch = titlePatchChannel(args.threadId);
  await redisPub.publish(
    ch,
    JSON.stringify({
      traceId: args.traceId,
      activityId: args.activityId,
      title: args.title,
    })
  );
}

// 캐시 키(본문 기반) — 동일한 body면 여러번 LLM 호출 안 함
export function titleCacheKey(kind: string, body: string) {
  const h = crypto
    .createHash("sha1")
    .update(`v1|${kind}|${body.trim().slice(0, 400)}`)
    .digest("hex");
  return `yua:activity_title:cache:${h}`;
}
