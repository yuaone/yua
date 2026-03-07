# 🔒 Solver Result Schema (SSOT)
# - 모든 solver (math / physics / chemistry / statistics) 공통 계약
# - 판단 / 해석 ❌
# - TS / Verifier / Normalizer가 신뢰하는 단일 진실원본

from typing import TypedDict, List, Dict, Optional, Any


class SolverMeta(TypedDict):
    engine: str
    latencyMs: int
    solver: str   # math | physics | chemistry | statistics


class SolverSuccessResult(TypedDict):
    final: Any                  # string | dict | symbolic repr
    value: Optional[Any]        # number | dict | None
    steps: List[str]


class SolverResponse(TypedDict):
    ok: bool
    result: Optional[SolverSuccessResult]
    meta: Optional[SolverMeta]
    error: Optional[str]
