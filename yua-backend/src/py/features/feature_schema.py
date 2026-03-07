 src/py/features/feature_schema.py

from typing import Dict, TypedDict


class RuntimeFeatureSnapshot(TypedDict):
    path: str
    windowHours: int
    sampleSize: int
    features: Dict[str, float]
