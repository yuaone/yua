import fs from "fs";
import path from "path";
import OpenAI from "openai";
import {
  redisPub,
  titleJobStreamKey,
  threadTitleJobStreamKey,
  titleDeadLetterStreamKey,
  threadTitlePatchChannel,
} from "../../db/redis";
import {
  publishTitlePatch,
  titleCacheKey
} from "./activity-title.queue";
 import { pgPool } from "../../db/postgres";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const OPENAI_SDK_VERSION: string = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const entry = require.resolve("openai");
    let dir = path.dirname(entry);
    for (let i = 0; i < 8; i++) {
      const pkgPath = path.join(dir, "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg?.name === "openai" && typeof pkg?.version === "string") {
          return pkg.version;
        }
      }
      dir = path.join(dir, "..");
    }
    return "unknown";
  } catch {
    return "unknown";
  }
})();

const ACTIVITY_STREAM = titleJobStreamKey();
const THREAD_STREAM = threadTitleJobStreamKey();
const GROUP = "yua_activity_title_workers";
const CONSUMER = `c-${process.pid}`;

const BATCH_SIZE = 8;
const BLOCK_MS = 1500;
const CACHE_TTL_SEC = 60 * 10;

type JobSource = {
  id?: string;
  label?: string;
  url: string;
  host?: string | null;
};

type Job = {
  streamName: string;
  streamId: string;
  threadId: number;
  traceId: string;
  // activity / thread 둘 다 지원
  activityId?: string;
  workspaceId?: string;
  kind?: string;
  body: string;
  hint?: string;
  sources?: JobSource[];
};

type TitleReq = {
  id: string;
  body: string;
  hint?: string;
  kind: "activity" | "thread";
  sourcesText?: string;
};

function activityCacheKeyFromJob(j: Job) {
  return titleCacheKey(String(j.kind ?? ""), String(j.body ?? ""));
}

function ruleBasedCompress(input: string): string {
  if (!input) return "";

  const lang = detectLanguage(input);
  let s = input.trim().toLowerCase();

  s = s.replace(/[?.!]/g, "");

  if (lang === "ko") {
    const replacements: [RegExp, string][] = [
      [/왜/g, "원인"],
      [/어떻게/g, "방법"],
      [/문제야|문제가 있어|이슈야/g, "문제"],
      [/에러/g, "오류"],
      [/느림|느려/g, "성능 저하"],
      [/안됨|안돼/g, "실패"],
      [/중복/g, "중복 이슈"],
      [/설명해줘|설명해주세요|설명 좀/g, "설명"],
      [/알려줘|알려주세요/g, ""],
    ];

    for (const [r, v] of replacements) {
      s = s.replace(r, v);
    }

    s = s.replace(/\b(지금|좀|이거|그거|근데|혹시|아니)\b/g, "");
    s = s.replace(/\b(을|를|이|가|은|는|에|에서|에게)\b/g, "");

    const words = s.split(/\s+/).filter(w => w.length >= 2);
    const unique = [...new Set(words)].slice(0, 4);

    return unique.join(" ").slice(0, 40).trim();
  }

  const replacements: [RegExp, string][] = [
    [/why/g, "cause"],
    [/how/g, "method"],
    [/error/g, "failure"],
    [/slow/g, "performance issue"],
    [/not working/g, "failure"],
    [/duplicate/g, "duplication"],
  ];

  for (const [r, v] of replacements) {
    s = s.replace(r, v);
  }

  s = s.replace(/\b(please|can you|i want to|trying to)\b/g, "");

  const stopwords = ["the", "a", "to", "is", "in", "at", "of"];
  const words = s
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.includes(w));

  const unique = [...new Set(words)].slice(0, 5);

  return unique.join(" ").slice(0, 40).trim();
}

function detectLanguage(text: string): "ko" | "en" {
  if (/\p{Script=Hangul}/u.test(text)) return "ko";
  const latin = text.match(/[a-zA-Z]/g)?.length ?? 0;
  if (latin > text.length * 0.3) return "en";
  return "en";
}
function scoreTitleQuality(title: string): number {
  const words = title.split(/\s+/);
  let score = 0;

  if (title.length >= 12) score += 1;
  if (words.length >= 3) score += 1;
  if (!/^(failure|issue|problem)$/i.test(title)) score += 1;

  return score; // 0~3
}

function similarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

function entropyScore(title: string): number {
  const freq: Record<string, number> = {};
  for (const c of title) {
    freq[c] = (freq[c] ?? 0) + 1;
  }

  const len = title.length;
  let entropy = 0;

  for (const k in freq) {
    const p = freq[k] / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}
function isThreadTitleJob(j: Job) {
  if (typeof j.streamName === "string" && j.streamName.includes("thread_title")) return true;
  if (typeof j.kind === "string" && j.kind.toLowerCase().includes("thread")) return true;
  if (typeof j.workspaceId === "string" && j.workspaceId.length > 0) return true;
  return false;
}

function parseSources(raw: string | undefined): JobSource[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    const mapped = parsed
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((x) => ({
        id: typeof x.id === "string" ? x.id : undefined,
        label: typeof x.label === "string" ? x.label : undefined,
        url: typeof x.url === "string" ? x.url : "",
        host: typeof x.host === "string" ? x.host : null,
      }))
      .filter((x) => x.url.length > 0);
    return mapped.length > 0 ? mapped : undefined;
  } catch {
    return undefined;
  }
}

function toSourcesText(sources?: JobSource[]): string | undefined {
  if (!Array.isArray(sources) || sources.length === 0) return undefined;
  const hosts = sources
    .map((s) => s.host)
    .filter((h): h is string => typeof h === "string" && h.length > 0);
  const urls = sources
    .map((s) => s.url)
    .filter((u) => typeof u === "string" && u.length > 0);
  const picked = hosts.length > 0 ? hosts : urls;
  return `Sources:\n${picked.slice(0, 8).join("\n")}`;
}

function parseEntries(xread: any): Job[] {
  const out: Job[] = [];
  if (!Array.isArray(xread) || xread.length === 0) return out;

  // [[stream, [[id, [k,v,k,v...]], ...]]]
  for (const [streamName, entries] of xread) {
    if (!Array.isArray(entries)) continue;
    for (const [id, kv] of entries) {
      const m: Record<string, string> = {};
      for (let i = 0; i < kv.length; i += 2) {
        m[String(kv[i])] = String(kv[i + 1] ?? "");
      }
      out.push({
        streamName: String(streamName),
        streamId: String(id),
        threadId: Number(m.threadId),
        traceId: m.traceId,
        activityId: m.activityId || undefined,
        workspaceId: m.workspaceId || undefined,
        kind: m.kind || undefined,
        body: m.body,
        hint: m.hint || undefined,
        sources: parseSources(m.sources),
      });
    }
  }
  return out;
}

async function publishThreadTitlePatch(args: {
  threadId: number;
  traceId?: string;
  title: string;
}) {
  // worker → StreamEngine redisSub branch 처리 (yua:thread_title:patch:{threadId})
  await redisPub.publish(
    threadTitlePatchChannel(args.threadId),
    JSON.stringify({ title: args.title, traceId: args.traceId })
  );
}

async function ensureGroup() {
  try {
    await redisPub.xgroup("CREATE", ACTIVITY_STREAM, GROUP, "$", "MKSTREAM");
  } catch (e: any) {
    if (!String(e?.message || "").includes("BUSYGROUP")) throw e;
  }

  try {
    await redisPub.xgroup("CREATE", THREAD_STREAM, GROUP, "$", "MKSTREAM");
  } catch (e: any) {
    // group already exists
    if (!String(e?.message || "").includes("BUSYGROUP")) throw e;
  }
}

function buildThreadTitlePrompt(lang: "ko" | "en") {
  if (lang === "ko") {
    return `
너는 사이드바에 표시될 기술 대화 제목을 생성한다.

제약:
- 명사구만 사용
- 동사 사용 금지
- 16~32자
- 조사 금지
- 따옴표 금지
- 마침표 금지
- 기술 태그 느낌
- 의미 재구성 필수
- 문장 그대로 반복 금지

스타일:
- GitHub 이슈 제목 스타일
- 검색 키워드처럼 압축
`;
  }

  return `
You generate sidebar thread titles.

Hard constraints:
- Noun phrase only
- No verbs
- 3 to 6 words
- No punctuation
- No quotes
- Must feel like a GitHub issue title
- Rewrite meaning
- Do not paraphrase sentence directly
- Return exactly ONE title.
- Output must contain exactly one item.
`;
}

function buildActivityTitlePrompt(lang: "ko" | "en") {
  if (lang === "ko") {
    return `
현재 작업(Activity)을 표현하는 카드 제목을 생성한다.

규칙:
- 명사형 중심
- 2~5 단어
- 동사 금지
- 기술 작업 카테고리 스타일
- 조사 금지
- sources(도메인/URL)가 있으면 작업의 근거로 반영
`;
  }

  return `
You generate activity card titles.

Rules:
- Task category style
- 2 to 5 words
- Noun-based
- No verbs
- If sources are present, anchor title semantics to those sources
- Compact technical phrasing
`;
}

// LLM batch call: JSON schema strict
async function generateTitlesBatch(
  items: TitleReq[]
) {
  const payload = items.map((j) => ({
    id: j.id,
    hint: j.hint ?? "",
    sources: j.sourcesText ?? "",
    body: j.body,
  }));

  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
          },
        },
      },
    },
  };


 const isThread = items.every(i => i.kind === "thread");
 const lang = detectLanguage(items.map(i => i.body).join(" "));

 const sys = isThread
   ? buildThreadTitlePrompt(lang)
   : buildActivityTitlePrompt(lang);
 const sysWithSeed =
   sys +
   `
 If seed is provided, use it as the semantic anchor.
 Do not ignore seed.
 `;
  const user = JSON.stringify({ items: payload }, null, 2);

  const res = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text: sysWithSeed ?? sys }],
      },
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: user }],
      },
    ] as any,
    max_output_tokens: 200,
    temperature: 0,
    text: {
      verbosity: "medium",
      format: {
        type: "json_schema",
        name: "activity_titles",
        strict: true,
        schema,
      },
    },
  } as any);
console.log("[TITLE_WORKER][LLM_RAW]", JSON.stringify(res, null, 2));

  const extractResponseText = (r: any): string => {
    // 1) SDK helper (README가 이걸 쓰는 표준)
    if (typeof r?.output_text === "string" && r.output_text.trim()) {
      return r.output_text.trim();
    }

    // 2) Raw output blocks (Responses API 기본 구조)
    // output: [{ content: [{ type:"output_text", text:"..." }, ...] }, ...]
    let acc = "";
    const out = r?.output;
    if (Array.isArray(out)) {
      for (const block of out) {
        const content = block?.content;
        if (!Array.isArray(content)) continue;
        for (const c of content) {
          if (typeof c?.text === "string") acc += c.text;
          if (typeof c?.output_text === "string") acc += c.output_text;
        }
      }
    }

    acc = acc.trim();
    if (acc) return acc;

    return "";
  };

  const raw = extractResponseText(res);
  if (!raw) {
    console.error("[TITLE_WORKER][EMPTY_LLM_RESPONSE]", {
      has_output_text: Boolean((res as any)?.output_text),
      has_output: Array.isArray((res as any)?.output),
      response_id: (res as any)?.id,
    });
    console.error("[TITLE_WORKER][EMPTY_LLM_RESPONSE_DUMP]", JSON.stringify(res, null, 2));
    throw new Error("TITLE_WORKER_EMPTY_LLM_RESPONSE");
  }

  let parsed: { items: { id: string; title: string }[] };
  try {
    parsed = JSON.parse(raw) as { items: { id: string; title: string }[] };
  } catch (e) {
    console.error("[TITLE_WORKER][INVALID_JSON_RAW]", raw);
    console.error("[TITLE_WORKER][INVALID_JSON_DUMP]", JSON.stringify(res, null, 2));
    throw e;
  }
  const map = new Map<string, string>();

 for (const it of parsed.items || []) {
   let t = String(it.title ?? "")
     .replace(/["'\n]/g, "")
     .trim();

   if (detectLanguage(t) === "en") {
     t = t.replace(/\b\w/g, c => c.toUpperCase());
   }

   if (it.id && t) {
     map.set(String(it.id), t);
   }
 }

 return map;
}
export async function startActivityTitleWorker() {
  await ensureGroup();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const xread = await redisPub.xreadgroup(
      "GROUP",
      GROUP,
      CONSUMER,
      "COUNT",
      BATCH_SIZE,
      "BLOCK",
      BLOCK_MS,
      "STREAMS",
      ACTIVITY_STREAM,
      THREAD_STREAM,
      ">",
      ">"
    );

    const jobs = parseEntries(xread);
    if (jobs.length === 0) continue;

    // 0) 캐시 체크 (activity/thread 분리)
    const cacheKeys = jobs.map((j) => {
    if (isThreadTitleJob(j)) {
      const key = `yua:thread_title:cache:${j.threadId}`;
      console.log("[TITLE_WORKER][CACHE_LOOKUP_THREAD]", {
        threadId: j.threadId,
        cacheKey: key
      });
      return key;
    }
      // activity job: body 기반 캐시
       return activityCacheKeyFromJob(j);
    });
    const cached = await redisPub.mget(cacheKeys);

    const needLLM: Job[] = [];
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i];
      const hit = cached[i];
      console.log("[TITLE_WORKER][JOB]", {
        threadId: j.threadId,
        isThread: isThreadTitleJob(j),
        hasCache: Boolean(hit),
        bodyPreview: j.body?.slice(0, 60)
      });
// 🔥 thread 수동 변경된 경우만 regenerate 금지 (New Chat은 허용)
if (isThreadTitleJob(j)) {

  const { rows } = await pgPool.query(
    `SELECT title, auto_titled FROM conversation_threads WHERE id = $1`,
    [j.threadId]
  );

  const existing = rows?.[0]?.title;
  const auto = rows?.[0]?.auto_titled;

  // 🔒 Skip 조건:
 // 🔥 Skip only if user manually renamed AFTER auto-title
 // 즉, auto_titled=false 이면서,
 // 기존 title이 있고,
 // 그리고 이미 한 번 auto_titled=true였던 경우만 차단

 // 🔒 SSOT: user manually renamed thread → auto title 금지
 if (!auto && existing && existing !== "New Chat") {
   console.log("[TITLE_WORKER][SKIP_MANUAL_RENAMED]", {
     threadId: j.threadId,
     existing,
   });
   await redisPub.xack(j.streamName, GROUP, j.streamId);
   continue;
 }
}
      if (hit) {
        if (isThreadTitleJob(j)) {
          const title = String(hit).trim().slice(0, 80);
          console.log("[TITLE_WORKER][CACHE_HIT_THREAD]", {
            threadId: j.threadId,
            title
          });
          
          if (title) {
            await publishThreadTitlePatch({
              threadId: j.threadId,
              traceId: j.traceId ?? "",
              title,
            });
          }
        } else {
          console.log("[TITLE_WORKER][CACHE_HIT_ACTIVITY]", {
            activityId: j.activityId,
            title: hit
          });
          await publishTitlePatch({
            threadId: j.threadId,
            traceId: j.traceId,
            activityId: String(j.activityId),
            title: String(hit),
          });
        }
        await redisPub.xack(j.streamName, GROUP, j.streamId);
      } else {
        console.log("[TITLE_WORKER][LLM_REQUIRED]", {
          threadId: j.threadId,
          activityId: j.activityId
        });
        needLLM.push(j);
      }
    }

    if (needLLM.length === 0) continue;
    console.log("[TITLE_WORKER][NEED_LLM_COUNT]", {
      count: needLLM.length
    });

    // 2) 배치 1회 LLM 호출
    try {
      // ✅ id 기반 범용 스키마로 요청
const titleMap = new Map<string, string>();

const req = needLLM.map((j) => {
  const compressed = ruleBasedCompress(j.body);


 const id = isThreadTitleJob(j)
   ? String(j.threadId)
   : String(j.activityId);

 // 🔥 Always call LLM for thread titles
 if (!isThreadTitleJob(j) &&
     compressed.length >= 8 &&
     compressed.length <= 40) {
   const safe = compressed
     .replace(/["'\n]/g, "")
     .trim();

   titleMap.set(id, safe);
   return null;
 }

  return {
    id,
    body: j.body,
    sourcesText: toSourcesText(j.sources),
    hint: j.hint,
    kind: (isThreadTitleJob(j) ? "thread" : "activity") as "thread" | "activity",
  };
}).filter(Boolean) as TitleReq[];

console.log("[TITLE_WORKER][REQ_COUNT]", {
  total: req.length
});

console.log("[TITLE_WORKER][RULE_ONLY_COUNT]", {
  count: needLLM.length - req.length
});

// 🔥 진짜 필요한 것만 LLM 호출
if (req.length > 0) {
  const threadReq = req.filter(r => r.kind === "thread");
  const activityReq = req.filter(r => r.kind === "activity");
 // 🔥 여기 추가
  console.log("[TITLE_WORKER][CALLING_LLM]", {
    threadCount: threadReq.length,
    activityCount: activityReq.length
  });

  if (threadReq.length > 0) {
    const threadMap = await generateTitlesBatch(threadReq);
    for (const [k, v] of threadMap) {
      titleMap.set(k, v);
    }
  }

  if (activityReq.length > 0) {
    const activityMap = await generateTitlesBatch(activityReq);
    for (const [k, v] of activityMap) {
      titleMap.set(k, v);
    }
  }
}

console.log("[TITLE_WORKER][LLM_RESULT]", {
  count: titleMap.size
});

      for (const j of needLLM) {
        const id = isThreadTitleJob(j) ? String(j.threadId) : String(j.activityId);
        const title = titleMap.get(id);

        if (title) {
          let safeTitle = String(title).trim();

          // 🔵 1️⃣ Confidence Fallback
          const qualityScore = scoreTitleQuality(safeTitle);
          if (qualityScore <= 1) {
            const fallback = ruleBasedCompress(j.body);
            if (fallback.length >= 8) {
              safeTitle = fallback;
            }
          }

          // 🔵 2️⃣ 품질 로그
          console.log("[TITLE_WORKER][TITLE_QUALITY]", {
            id,
            title: safeTitle,
            score: scoreTitleQuality(safeTitle)
          });

          console.log("[TITLE_WORKER][LLM_TITLE]", {
            id,
            safeTitle
          });

          if (isThreadTitleJob(j)) {
  // 🔵 3️⃣ Workspace Duplicate 방지
  if (j.workspaceId) {
    const { rows: dupRows } = await pgPool.query(
      `
      SELECT COUNT(*)::int as cnt
      FROM conversation_threads
      WHERE workspace_id = $1
      AND title = $2
      `,
      [j.workspaceId, safeTitle]
    );

    const dupCount = dupRows?.[0]?.cnt ?? 0;

    if (dupCount > 0) {
      safeTitle = `${safeTitle} ${dupCount + 1}`;
    }
  } 

  // 🔵 4️⃣ 최근 5개 thread semantic 비교
  if (j.workspaceId) {
    const { rows: recentRows } = await pgPool.query(
      `
      SELECT title
      FROM conversation_threads
      WHERE workspace_id = $1
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [j.workspaceId]
    );

    for (const r of recentRows) {
      const existingTitle = String(r.title ?? "");
      const sim = similarity(existingTitle, safeTitle);

      if (sim >= 0.7) {
        safeTitle = `${safeTitle} ${Date.now().toString().slice(-3)}`;
        break;
      }
    }
  }

  // 🔵 5️⃣ Entropy 점수 검사
  const entropy = entropyScore(safeTitle);
  if (entropy < 2.5) {
    const fallback = ruleBasedCompress(j.body);
    if (fallback.length >= 8) {
      safeTitle = fallback;
    }
  }
  // 🔥 1. DB 직접 업데이트 (SSOT)
  await pgPool.query(
    `
    UPDATE conversation_threads
    SET title = $1,
        auto_titled = true
    WHERE id = $2
    `,
    [safeTitle, j.threadId]
  );
   // 🔥 2. Redis cache (threadId 기반)
  const threadCacheKey = `yua:thread_title:cache:${j.threadId}`;
  console.log("[TITLE_WORKER][CACHE_SET_THREAD]", {
    threadId: j.threadId,
    cacheKey: threadCacheKey,
    title: safeTitle
  });

  await redisPub.set(
    threadCacheKey,
    safeTitle,
    "EX",
    CACHE_TTL_SEC
  );

  // 🔥 3. Live UI notify
  await publishThreadTitlePatch({
    threadId: j.threadId,
    traceId: j.traceId ?? "",
    title: safeTitle,
  });
console.log("[TITLE_WORKER][PATCH_PUBLISHED]", {
  threadId: j.threadId,
  traceId: j.traceId,
  title: safeTitle
});

	 // ✅ SSOT: thread cache는 DB 업데이트 성공 이후에만 set (StreamEngine가 책임)
	          } else {
	            console.debug("[TITLE_WORKER_PUBLISH]", {
	              activityId: String(j.activityId),
	              title: safeTitle,
	            });
	            await publishTitlePatch({
	              threadId: j.threadId,
	              traceId: j.traceId,
	              activityId: String(j.activityId),
              title: safeTitle,
            });
            // ✅ SSOT: activity title cache (10m) — (kind+body) hash 단위
            // - 동일 body면 activityId가 달라도 LLM 재호출 방지
            // - pipeline deterministic 유지
            await redisPub.set(
              activityCacheKeyFromJob(j),
              safeTitle,
              "EX",
              CACHE_TTL_SEC
            );
          }
          await redisPub.xack(j.streamName, GROUP, j.streamId);
          continue;
        }

        // title 생성 실패 → deadletter
        await redisPub.xadd(
          titleDeadLetterStreamKey(),
          "*",
         "reason",
         "missing_title_in_model_output",
          "streamId",
          j.streamId,
          "streamName",
          j.streamName,
          "threadId",
          String(j.threadId),
          "activityId",
          String(j.activityId ?? ""),
          "workspaceId",
          String(j.workspaceId ?? ""),
          "isThreadTitle",
          isThreadTitleJob(j) ? "1" : "0",
          "cacheKey",
          isThreadTitleJob(j)
            ? `yua:thread_title:cache:${j.threadId}`
            : activityCacheKeyFromJob(j),
          "body",
          j.body.slice(0, 200)
        );
        await redisPub.xack(j.streamName, GROUP, j.streamId);
      }
    } catch (err: any) {
      console.error("[TITLE_WORKER][LLM_ERROR]", err);
      // best-effort: 실패해도 ACK 해서 재시도 폭주 방지
      // ✅ DLQ에 에러 로그 남기고 ACK
      const msg = String(err?.message ?? err ?? "unknown_error").slice(0, 300);

      // 1) DLQ 기록
      for (const j of needLLM) {
        await redisPub.xadd(
          titleDeadLetterStreamKey(),
          "*",
          "reason",
          "worker_exception",
          "error",
          msg,
          "streamId",
          j.streamId,
          "streamName",
          j.streamName,
          "threadId",
          String(j.threadId),
          "activityId",
          String(j.activityId ?? ""),
          "workspaceId",
          String(j.workspaceId ?? ""),
          "isThreadTitle",
          isThreadTitleJob(j) ? "1" : "0",
          "cacheKey",
          isThreadTitleJob(j)
            ? `yua:thread_title:cache:${j.threadId}`
            : activityCacheKeyFromJob(j),
          "body",
          String(j.body ?? "").slice(0, 200)
        );
      }

      // 2) ACK (재시도 폭주 방지)
      for (const j of needLLM) {
        await redisPub.xack(j.streamName, GROUP, j.streamId);
      }
    }
  }
}
if (require.main === module) {
  console.log("🟢 [TITLE_WORKER] standalone boot");
  console.log("[TITLE_WORKER][SDK_VERSION]", OPENAI_SDK_VERSION);
  startActivityTitleWorker().catch((err) => {
    console.error("🔴 [TITLE_WORKER] crash", err);
    process.exit(1);
  });
}
