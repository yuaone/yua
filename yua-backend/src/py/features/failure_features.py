# src/py/features/failure_features.py

from typing import List, Dict


def build_failure_features(
    failure_kinds: List[str],
    total_events: int,
) -> Dict[str, float]:
    if total_events == 0:
        return {
            "failure_density": 0.0,
            "tool_fail_rate": 0.0,
            "tool_fail_streak": 0.0,
            "confidence_drop_events": 0.0,
        }

    tool_fail_streak = 0
    current_streak = 0

    tool_fail_count = 0
    confidence_drop_count = 0

    for fk in failure_kinds:
        if fk == "TOOL_FAIL":
            tool_fail_count += 1
            current_streak += 1
            tool_fail_streak = max(tool_fail_streak, current_streak)
        else:
            current_streak = 0

        if fk == "CONFIDENCE_DROP":
            confidence_drop_count += 1

    failure_density = len(failure_kinds) / total_events
    tool_fail_rate = tool_fail_count / total_events

    return {
        "failure_density": round(failure_density, 4),
        "tool_fail_rate": round(tool_fail_rate, 4),
        "tool_fail_streak": float(tool_fail_streak),
        "confidence_drop_events": float(confidence_drop_count),
    }
