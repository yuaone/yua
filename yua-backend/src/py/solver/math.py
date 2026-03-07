from sympy import (
    symbols, Eq, solve, sympify,
    diff, integrate, simplify, limit
)
from sympy.parsing.sympy_parser import parse_expr
from typing import List, Dict, Any


def solve_math(query: str, options: dict) -> Dict[str, Any]:
    q = query.strip()
    mode = options.get("mode", "auto")
    want_steps = options.get("wantSteps", True)

    steps: List[str] = []

    # ---------------------------
    # Helper
    # ---------------------------
    def parse_equation(eq: str):
        left, right = eq.split("=", 1)
        return parse_expr(left), parse_expr(right)

    # ---------------------------
    # AUTO MODE
    # ---------------------------
    if mode == "auto":
        if "=" in q:
            mode = "equation"
        elif "d/d" in q or "diff" in q or "'" in q:
            mode = "calculus"
        else:
            mode = "simplify"

    # ---------------------------
    # EQUATION / SYSTEM
    # ---------------------------
    if mode in ("equation", "system"):
        equations = []
        if ";" in q:
            # 연립방정식
            parts = q.split(";")
            for p in parts:
                l, r = parse_equation(p)
                equations.append(Eq(l, r))
        else:
            l, r = parse_equation(q)
            equations.append(Eq(l, r))

        # 변수 자동 추출
        vars_set = set()
        for eq in equations:
            vars_set |= eq.free_symbols

        if not vars_set:
            raise ValueError("No variables detected")

        vars_list = sorted(vars_set, key=lambda v: v.name)

        sol = solve(equations, vars_list, dict=True)

        if not sol:
            raise ValueError("No solution found")

        solution = sol[0]

        if want_steps:
            for eq in equations:
                steps.append(str(eq))
            for v in vars_list:
                steps.append(f"{v} = {solution[v]}")

        return {
            "final": {str(k): str(v) for k, v in solution.items()},
            "value": {str(k): float(v) for k, v in solution.items()},
            "steps": steps,
        }

    # ---------------------------
    # CALCULUS
    # ---------------------------
    if mode == "calculus":
        expr = parse_expr(q.replace("d/d", ""))
        vars_in_expr = list(expr.free_symbols)

        if not vars_in_expr:
            raise ValueError("No variable for calculus")

        v = vars_in_expr[0]

        if "integrate" in q:
            res = integrate(expr, v)
            steps.append(f"∫ {expr} d{v} = {res}")
        else:
            res = diff(expr, v)
            steps.append(f"d/d{v} ({expr}) = {res}")

        return {
            "final": str(res),
            "value": None,
            "steps": steps,
        }

    # ---------------------------
    # SIMPLIFY / EVAL
    # ---------------------------
    expr = sympify(q)
    simp = simplify(expr)

    steps.append(str(expr))
    if simp != expr:
        steps.append(str(simp))

    try:
        val = float(simp.evalf())
    except Exception:
        val = None

    return {
        "final": str(simp),
        "value": val,
        "steps": steps,
    }
