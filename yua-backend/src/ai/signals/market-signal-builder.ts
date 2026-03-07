import type { YuaSignal } from "./yua-signal.types";

type MarketBar = { close: number };
type EventPattern = {
  mean_return: number;
  std_return: number;
  positive_ratio: number;
  sample_size: number;
};

export function buildEventMarketSignals(args: {
  bars: MarketBar[];
  patternsByHorizon: Record<string, Record<string, EventPattern>>;
}): YuaSignal[] {
  const { bars, patternsByHorizon } = args;
  const signals: YuaSignal[] = [];

  if (bars.length < 2) return signals;

  // 📉 Market baseline
  const returns: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    returns.push(
      (bars[i].close - bars[i - 1].close) / bars[i - 1].close
    );
  }
  const marketMean =
    returns.reduce((a, b) => a + b, 0) / returns.length;

  for (const [horizon, patterns] of Object.entries(patternsByHorizon)) {
    let weightedScore = 0;
    let weightSum = 0;

    Object.values(patterns).forEach(p => {
      const weight = p.sample_size * p.positive_ratio;
      weightedScore += p.mean_return * weight;
      weightSum += weight;
    });

    if (weightSum === 0) continue;

    const eventScore = weightedScore / weightSum;
    const combinedValue = eventScore - marketMean;

    signals.push({
      origin: "EventMarketSolver",
      value: Number(combinedValue.toFixed(4)),
      confidence: Math.min(1, weightSum / 2000),
      volatility: Math.abs(eventScore),
      sampleSize: Math.round(weightSum),
      timestamp: new Date().toISOString(),
      metadata: {
        horizon,
        marketBaseline: marketMean,
        method: "event_weighted_return_delta",
      },
    });
  }

  return signals;
}
