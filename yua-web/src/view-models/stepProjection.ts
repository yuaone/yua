import type { OverlayChunk } from "@/store/useStreamSessionStore";
const urlRegex = /(https?:\/\/[^\s]+)/g;

const urlLineRegex = /^\s*(?:[-*]\s*)?(https?:\/\/\S+)\s*$/gm;

function stripUrlNoise(text: string) {
  return (text ?? "")
    // ✅ "URL만 있는 줄" 제거 (- https:// 포함)
    .replace(urlLineRegex, "")
    // ✅ 문장 중간에 박힌 URL은 URL만 제거
    .replace(urlRegex, "")
    // ✅ 과한 빈줄 정리
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function looksLikeAsciiBoxDiagram(text: string) {
  if (!text) return false;
  if (!/[┌┐└┘│─]/.test(text)) return false;
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 3) return false;
  const hasTop = lines.some((l) => /┌.*┐/.test(l));
  const hasBottom = lines.some((l) => /└.*┘/.test(l));
  return hasTop && hasBottom;
}

function ensureCodeFenceForAscii(text: string) {
  const t = text ?? "";
  if (!looksLikeAsciiBoxDiagram(t)) return t;
  if (/^\s*```/.test(t)) return t;
  return `\`\`\`text\n${t}\n\`\`\``;
}

function extractUrls(text?: string | null) {
  if (!text) return [];

  const matches = text.match(urlRegex);
  if (!matches) return [];

  return matches.map((url) => {
    let host: string | undefined;
    try {
      host = new URL(url).hostname;
    } catch {}

    return {
      id: url,
      label: host ?? url,
      url,
      host,
    };
  });
}
type SourceShape = {
  id: string;
  label: string;
  url: string;
  host?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function readSourceArray(value: unknown): SourceShape[] {
  if (!Array.isArray(value)) return [];

  const out: SourceShape[] = [];
  for (let i = 0; i < value.length; i++) {
    const rec = asRecord(value[i]);
    if (!rec) continue;

    const url = typeof rec.url === "string" ? rec.url.trim() : "";
    if (!url) continue;

    let host =
      typeof rec.host === "string" && rec.host.trim().length > 0
        ? rec.host.trim()
        : null;

    if (!host) {
      try {
        host = new URL(url).hostname;
      } catch {
        host = null;
      }
    }

    const label =
      typeof rec.label === "string" && rec.label.trim().length > 0
        ? rec.label.trim()
        : host ?? url;

    const id =
      typeof rec.id === "string" && rec.id.trim().length > 0
        ? rec.id
        : `${url}#${i}`;

    out.push({ id, label, url, host });
  }

  return out;
}

function normalizeSourceKey(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${host}${path}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

function dedupeSources(sources: SourceShape[]) {
  const seen = new Set<string>();
  const out: SourceShape[] = [];

  for (const s of sources) {
    const key = normalizeSourceKey(s.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  return out;
}

function readMetaSources(chunk: OverlayChunk) {
  const rec = asRecord(chunk.meta);
  if (!rec) return [];
  return readSourceArray(rec.sources);
}

function readChunkSources(chunk: OverlayChunk) {
  return readSourceArray(chunk.sources);
}

function readChunkStatus(chunk: OverlayChunk): "RUNNING" | "OK" | "FAILED" | null {
  const rec = chunk as OverlayChunk & { status?: unknown };
  const status = rec.status;
  if (status === "RUNNING" || status === "OK" || status === "FAILED") {
    return status;
  }
  return null;
}

function hasFailureSignal(chunk: OverlayChunk) {
  if (readChunkStatus(chunk) === "FAILED") return true;

  const meta = asRecord(chunk.meta);
  if (!meta) return false;

  if (meta.status === "FAILED") return true;
  return Boolean(meta.error);
}

function pickSourcesByPriority(sorted: OverlayChunk[]) {
  const chunkSources = dedupeSources(sorted.flatMap(readChunkSources));
  if (chunkSources.length > 0) return chunkSources;

  const metaSources = dedupeSources(sorted.flatMap(readMetaSources));
  if (metaSources.length > 0) return metaSources;

  const extracted = dedupeSources(
    sorted.flatMap((g) =>
      extractUrls(typeof g.body === "string" ? g.body : undefined)
    )
  );
  return extracted.length > 0 ? extracted : undefined;
}

export type StepView = {
  id: string;
  groupIndex?: number;
  kind: OverlayChunk["kind"];
  title: string;
  body?: string | null;
  sources?: {
    id: string;
    label: string;
    url: string;
    host?: string | null;
  }[];
  status: "RUNNING" | "OK" | "FAILED";
  metaTool?: string | null;
  artifact?: import("yua-shared/tool/tool-artifact.types").ToolArtifact | null;
  meta?: Record<string, unknown> | null;
};

export function deriveStepsFromChunks(
  chunks: OverlayChunk[]
): StepView[] {
  const list = (chunks ?? [])
    .filter((c) => c.source === "ACTIVITY")
    .filter((c) => c.kind != null)
    .slice()
    .sort((a, b) => a.index - b.index);

  return list.map((chunk) => {
    const sources = pickSourcesByPriority([chunk]);

    const bodyRaw =
      typeof chunk.body === "string"
        ? stripUrlNoise(chunk.body) || null
        : null;
    const body =
      typeof bodyRaw === "string" ? ensureCodeFenceForAscii(bodyRaw) : bodyRaw;

    let status: "RUNNING" | "OK" | "FAILED";
    if (hasFailureSignal(chunk)) {
      status = "FAILED";
    } else if (chunk.done === false || readChunkStatus(chunk) === "RUNNING") {
      status = "RUNNING";
    } else {
      status = "OK";
    }

    const title =
      typeof chunk.title === "string" && chunk.title.length > 0
        ? chunk.title
        : "";

    const artifact = (chunk as any).artifact ?? null;

    return {
      id: chunk.chunkId,
      groupIndex: chunk.groupIndex,
      kind: chunk.kind,
      title,
      body,
      sources,
      status,
      metaTool: chunk.metaTool ?? null,
      artifact,
      meta: chunk.meta ?? null,
    };
  });
}
