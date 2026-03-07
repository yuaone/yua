import type { ToolRunResult, TrustedFactHint } from "./tool-runner";
import type { YuaSignal } from "../signals/yua-signal.types";
import { buildEventMarketSignals } from "../signals/market-signal-builder";
import type { MarketDataStatus } from "./tool-types";

export function normalizeToolResults(results: ToolRunResult[]) {
  const trustedFacts: TrustedFactHint[] = [];
  const signals: YuaSignal[] = [];
  let dropped = 0;

  const toDate = (ts?: number) =>
    ts ? new Date(ts).toISOString().slice(0, 10) : undefined;

  for (const r of results) {
    if (!r.verified) {
      dropped += 1;
      continue;
    }

    // 🔒 SSOT: MARKET_DATA = PY_SOLVER alias
    if (r.tool !== "PY_SOLVER" && r.tool !== "MARKET_DATA") {
      continue;
    }

    const raw =
      (r as any).result ??
      (r.rawResult as any)?.result ??
      (r.rawResult as any)?.data ??
      r.rawResult;

    const rows = Array.isArray(raw?.results)
      ? raw.results
      : raw && Array.isArray(raw?.bars)
      ? [raw]
      : [];

    for (const result of rows) {
      if (!result?.symbol) continue;

      const bars = Array.isArray(result.bars) ? result.bars : [];

      // 🔥 SSOT: status / reason / asOf는 PY 결과만 신뢰
      const status = (result.status ?? "ERROR") as MarketDataStatus;
      const reason = (result.reason ?? null) as string | null;
      const asOf = (result.asOf ?? null) as number | null;

      const first = bars[0];
      const latest = bars.at(-1);

      const latestTimestamp =
        (latest as any)?.timestamp ??
        (latest as any)?.t ??
        (latest as any)?.time;

      const latestClose =
        (latest as any)?.close ??
        (latest as any)?.c;

      /* ------------------------------
       * 1️⃣ EVENT → SIGNAL
       * ------------------------------ */
      if (result.eventPatterns && bars.length >= 2) {
        const signalsFromEvents = buildEventMarketSignals({
          bars,
          patternsByHorizon: result.eventPatterns,
        });
        signals.push(...signalsFromEvents);
      }

      /* ------------------------------
       * 2️⃣ TRUSTED FACT (STATE BASED)
       * ------------------------------ */

      const allowNumbers = status === "OK";

      if (
        allowNumbers &&
        bars.length === 1 &&
        latestTimestamp != null &&
        latestClose != null
      ) {
        // ✅ exact + quorum 확정
        trustedFacts.push({
          kind: "MARKET_SERIES",
          symbol: result.symbol,
          market: result.market,
          source: result.source,
          granularity: "daily",
          coverage: {
            start: toDate(latestTimestamp),
            end: toDate(latestTimestamp),
          },
          status,
          reason,
          asOf,
          latest: {
            date: toDate(latestTimestamp),
            fields: {
              open: (latest as any)?.open ?? (latest as any)?.o,
              high: (latest as any)?.high ?? (latest as any)?.h,
              low: (latest as any)?.low ?? (latest as any)?.l,
              close: latestClose,
              volume: (latest as any)?.volume ?? (latest as any)?.v,
            },
          },
        });
        continue;
      }

      if (allowNumbers && first && latest) {
        // ✅ range / year OK
        trustedFacts.push({
          kind: "MARKET_SERIES",
          symbol: result.symbol,
          market: result.market,
          source: result.source,
          granularity: "daily",
          coverage: {
            start: toDate(first.timestamp),
            end: toDate(latest.timestamp),
          },
          status,
          reason,
          asOf,
          latest: {
            date: toDate(latest.timestamp),
            fields: {
              open: latest.open,
              high: latest.high,
              low: latest.low,
              close: latest.close,
              volume: latest.volume,
            },
          },
        });
        continue;
      }

      // ❌ 숫자 노출 금지 (DELAYED / NO_DATA / FUTURE)
      trustedFacts.push({
        kind: "MARKET_SERIES",
        symbol: result.symbol,
        market: result.market,
        source: result.source,
        granularity: "daily",
        coverage: {
          start: toDate(first?.timestamp),
          end: toDate(latest?.timestamp),
        },
        status,
        reason,
        asOf,
      });
    }
  }

  return { trustedFacts, signals, dropped };
}
