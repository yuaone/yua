# src/py/features/feature_builder.py

from typing import List, Dict
from .feature_schema import RuntimeFeatureSnapshot
from .confidence_features import build_confidence_features
from .window_features import build_window_features
from .failure_features import build_failure_features


def build_runtime_feature_snapshot(
    *,
    path: str,
    window_hours: int,
    confidences: List[float],
    confidence_timestamps: List[float],
    verdicts: List[str],
    window_indices: List[int],
    failure_kinds: List[str],
) -> RuntimeFeatureSnapshot:
    """
    🔒 SSOT:
    - 계산만
    - 판단 없음
    - write 없음
    """

    sample_size = len(confidences)

    features: Dict[str, float] = {}

    features.update(
        build_confidence_features(
            confidences=confidences,
            timestamps=confidence_timestamps,
        )
    )

    features.update(
        build_window_features(
            verdicts=verdicts,
            window_indices=window_indices,
        )
    )

    features.update(
        build_failure_features(
            failure_kinds=failure_kinds,
            total_events=sample_size,
        )
    )

    return {
        "path": path,
        "windowHours": window_hours,
        "sampleSize": sample_size,
        "features": features,
    }
