# src/py/features/confidence_features.py

from typing import List, Dict
import numpy as np


def build_confidence_features(
    confidences: List[float],
    timestamps: List[float],
) -> Dict[str, float]:
    """
    confidences: 시간순 confidence 값
    timestamps: epoch seconds (같은 길이)
    """

    if not confidences:
        return {
            "confidence_mean": 0.0,
            "confidence_slope": 0.0,
            "confidence_volatility": 0.0,
        }

    arr = np.array(confidences, dtype=float)

    mean = float(arr.mean())
    volatility = float(arr.std())

    # slope (시간 기반 선형 회귀)
    if len(arr) >= 2:
        t = np.array(timestamps, dtype=float)
        t = t - t[0]  # 안정화
        slope = float(np.polyfit(t, arr, 1)[0])
    else:
        slope = 0.0

    return {
        "confidence_mean": round(mean, 4),
        "confidence_slope": round(slope, 4),
        "confidence_volatility": round(volatility, 4),
    }
    