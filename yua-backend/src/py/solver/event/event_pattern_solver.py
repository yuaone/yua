# 🔒 Event Pattern Solver (SSOT)
# - 판단 ❌
# - 예측 ❌
# - 통계적 관측만 ⭕

from .event_extractor import extract_events
from .outcome_calculator import calculate_outcomes


def solve_event_pattern(query, options):
    bars = options.get("bars")
    horizons = options.get("horizons", ["T+1"])

    if not bars or len(bars) < 60:
        raise ValueError("INSUFFICIENT_BAR_DATA")

    events = extract_events(bars)

    patterns_by_horizon = {}

    for h in horizons:
        if isinstance(h, str) and h.startswith("T+"):
            horizon_n = int(h[2:])
        else:
            horizon_n = 1

        stats = calculate_outcomes(
            bars=bars,
            events=events,
            horizon=horizon_n,
            min_samples=30,
        )

        patterns_by_horizon[f"T+{horizon_n}"] = stats

    return {
        "patternsByHorizon": patterns_by_horizon,
        "sample_size": sum(
            v["sample_size"]
            for horizon in patterns_by_horizon.values()
            for v in horizon.values()
        ),
    }
