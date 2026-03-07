# 🔒 Outcome Calculator (SSOT)
# - 확률적 관측
# - 재현 가능
# - horizon 일반화

import math
from collections import defaultdict


def calculate_outcomes(
    bars,
    events,
    horizon: int,
    min_samples: int = 30,
):
    # event_id → list[return]
    buckets = defaultdict(list)

    for idx, event_id in events:
        exit_idx = idx + horizon
        if exit_idx >= len(bars):
            continue

        entry = bars[idx]["close"]
        exit_ = bars[exit_idx]["close"]

        if entry <= 0:
            continue

        ret = (exit_ - entry) / entry
        buckets[event_id].append(ret)

    results = {}

    for event_id, returns in buckets.items():
        n = len(returns)
        if n < min_samples:
            continue

        mean = sum(returns) / n
        variance = sum((r - mean) ** 2 for r in returns) / n
        std = math.sqrt(variance)

        pos = sum(1 for r in returns if r > 0)
        neg = n - pos

        results[event_id] = {
            "mean_return": round(mean, 4),
            "std_return": round(std, 4),
            "positive_ratio": round(pos / n, 3),
            "negative_ratio": round(neg / n, 3),
            "sample_size": n,
            # 🔥 downstream 신뢰도 계산용
            "sharpe_like": round(mean / std, 3) if std > 0 else 0,
        }

    return results
