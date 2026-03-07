# 🔒 Solver Registry (SSOT)

from typing import Callable, Dict, List

SolverFn = Callable[[str, dict], dict]
SolverFactory = Callable[[], SolverFn]

SOLVER_REGISTRY: Dict[str, Dict] = {}

def register_solver(
    name: str,
    factory: SolverFactory,
    keywords: List[str],
):
    SOLVER_REGISTRY[name] = {
        "factory": factory,
        "keywords": keywords,
        "solver": None,  # lazy resolved
    }
