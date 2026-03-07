// 📂 src/lib/streamer.ts
// 🔥 YUA-AI SSE Streamer — FINAL AUTH-AWARE VERSION (2025.12)

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function startStream(
  payload: { message: string; model: string },
  onDelta: (token: string) => void,
  onFinish: () => void,
  signal?: AbortSignal,
  onDeltaStage?: (chunk: { stage: string; output: any }) => void,
  authFetch?: FetchLike // ⭐ 추가 (선택)
) {
  const model = payload.model;
  const base = process.env.NEXT_PUBLIC_STREAM_URL || "http://localhost:5000";

  let endpoint = "/api/chat/chat-stream";
  if (model === "spine") endpoint = "/api/chat/spine-stream";

  const url =
    `${base}${endpoint}` +
    `?message=${encodeURIComponent(payload.message)}` +
    `&model=${encodeURIComponent(model)}`;

  const fetcher = authFetch ?? fetch;

  const res = await fetcher(url, {
    method: "GET",
    headers: { Accept: "text/event-stream" },
    signal,
  });

  if (!res.ok || !res.body) {
    console.error("❌ SSE Stream Error:", res.status, url);
    onFinish();
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const txt = decoder.decode(value);
      const lines = txt.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const data = line.replace("data:", "").trim();
        if (!data) continue;

        try {
          const json = JSON.parse(data);

          if (json.token) {
            onDelta(json.token);
            continue;
          }

          if (json.stage && onDeltaStage) {
            onDeltaStage({
              stage: json.stage,
              output: json.output ?? {},
            });
            continue;
          }

          if (json.done) {
            onFinish();
            return;
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.error("❌ SSE Reader Error:", err);
  }

  onFinish();
}
