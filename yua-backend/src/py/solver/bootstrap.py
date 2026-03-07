# 🔒 Solver Bootstrap (SSOT)
# - solver는 여기서만 등록
# - lazy import 안전하게 수행

from .registry import register_solver

def _lazy_math():
    from .math import solve_math
    return solve_math

def _lazy_physics():
    from .physics import solve_physics
    return solve_physics

def _lazy_chemistry():
    from .chemistry import solve_chemistry
    return solve_chemistry

def _lazy_statistics():
    from .statistics import solve_statistics
    return solve_statistics

def _lazy_market():
    from .market.market_data_solver import solve_market_data
    return solve_market_data

def _lazy_event():
    from .event.event_pattern_solver import solve_event_pattern
    return solve_event_pattern

register_solver("math", _lazy_math, ["=", "solve", "diff", "integrate"])
register_solver("physics", _lazy_physics, ["force", "energy", "velocity", "물리"])
register_solver("chemistry", _lazy_chemistry, ["reaction", "mole", "화학", "->"])
register_solver("statistics", _lazy_statistics, ["mean", "variance", "probability", "통계"])
register_solver("market", _lazy_market, ["주가", "시세", "stock", "market"])
register_solver("event", _lazy_event, ["event", "pattern", "거래량", "갭"])
