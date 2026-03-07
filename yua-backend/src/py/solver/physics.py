# 🔒 Physics Solver (SSOT — Symbolic / Dynamic)

from typing import Dict, Any, List
from sympy import symbols, Eq, solve, sympify
from sympy.core.symbol import Symbol


def solve_physics(query: str, options: Dict[str, Any]) -> Dict[str, Any]:
    want_steps = options.get("wantSteps", True)
    steps: List[str] = []

    # 1️⃣ 관계식 파싱
    eq_strings: List[str] = options.get("equations", [])
    if not eq_strings:
        raise ValueError("No equations provided")

    equations = []
    for e in eq_strings:
        if "=" not in e:
            raise ValueError(f"Invalid equation: {e}")
        l, r = e.split("=", 1)
        eq = Eq(sympify(l), sympify(r))
        equations.append(eq)
        if want_steps:
            steps.append(str(eq))

    # 2️⃣ known 값 주입
    knowns = options.get("knowns", {})
    substituted = [eq.subs(knowns) for eq in equations]

    # 3️⃣ target 결정
    target_name = options.get("target")
    if target_name:
        target: Symbol = symbols(target_name)
        unknowns = [target]
    else:
        # 값이 없는 심볼 자동 추론
        all_symbols = set().union(
            *[eq.free_symbols for eq in substituted]
        )
        known_symbols = {symbols(k) for k in knowns.keys()}
        unknowns = list(all_symbols - known_symbols)

        if not unknowns:
            raise ValueError("No unknown variable to solve")

    # 4️⃣ 풀이
    sol = solve(substituted, unknowns, dict=True)

    if not sol:
        return {
            "final": None,
            "value": None,
            "steps": steps + ["No solution"],
        }

    # 단일 해만 반환 (SSOT)
    result = sol[0]
    return {
        "final": {str(k): str(v) for k, v in result.items()},
        "value": None,
        "steps": steps,
    }
