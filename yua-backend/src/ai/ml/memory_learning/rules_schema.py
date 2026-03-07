# 📂 ml/memory_learning/rules_schema.py
# 🔒 YUA Memory Rule Schema — PHASE 9-9.5 SSOT

from typing import Dict, TypedDict


class AutoCommitRule(TypedDict):
    minConfidenceBySource: Dict[str, float]


class DriftRule(TypedDict):
    low: float
    medium: float
    high: float


class MergeRule(TypedDict):
    threshold: float


class MemoryRules(TypedDict):
    autoCommit: AutoCommitRule
    drift: DriftRule
    merge: MergeRule
