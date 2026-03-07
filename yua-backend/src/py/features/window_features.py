# src/py/features/window_features.py

from typing import List, Dict
import numpy as np


def build_window_features(
    verdicts: List[str],
    window_indices: List[int],
) -> Dict[str, float]:
    """
    verdicts: 시간순 verdict 값
    window_indices: 동일 길이, window bucket id
    """

    total = len(verdicts)
    if total == 0:
        return {
            "hold_rate": 0.0,
            "hold_burst_score": 0.0,
        }

    hold_flags = np.array([1 if v == "HOLD" else 0 for v in verdicts])
    hold_rate = float(hold_flags.mean())

    # burst: window 별 HOLD 집중도
    burst = 0.0
    if hold_flags.sum() > 0:
        per_window = {}
        for w, h in zip(window_indices, hold_flags):
            per_window[w] = per_window.get(w, 0) + h

        max_burst = max(per_window.values())
        burst = max_burst / max(hold_flags.sum(), 1)

    return {
        "hold_rate": round(hold_rate, 4),
        "hold_burst_score": round(burst, 4),
    }
