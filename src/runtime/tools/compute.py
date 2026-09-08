"""YUA Runtime — Compute 도구: calculator, calculate, unit_convert, datetime.

eval()은 쓰지 않는다. AST를 직접 걸어서 허용된 노드만 계산한다.
"""

from __future__ import annotations

import ast
import datetime as _dt
import math
import operator
from typing import Any

from .base import EXECUTION_ERROR, INVALID_PARAMS, ToolError, ToolSpec

__all__ = ["TOOLS", "safe_eval"]

# 허용 연산자 — 비트연산/대입/속성접근은 의도적으로 제외
_BIN_OPS: dict[type[ast.operator], Any] = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_UNARY_OPS: dict[type[ast.unaryop], Any] = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}

# calculate 전용: math 라이브러리 화이트리스트
_MATH_NS: dict[str, Any] = {
    name: getattr(math, name)
    for name in (
        "sqrt", "cbrt", "log", "log2", "log10", "exp", "pow",
        "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
        "floor", "ceil", "fabs", "factorial", "gcd", "hypot",
        "degrees", "radians", "trunc",
    )
    if hasattr(math, name)
}
_MATH_NS.update({"pi": math.pi, "e": math.e, "tau": math.tau, "inf": math.inf})
_MATH_NS.update({"abs": abs, "round": round, "min": min, "max": max, "sum": sum})

# 지수 폭발로 프로세스를 멈추게 하는 입력을 막는다 (2**10**9 같은 것)
_MAX_POW_EXPONENT = 1_000_000


def _eval_node(node: ast.AST, ns: dict[str, Any]) -> Any:
    if isinstance(node, ast.Expression):
        return _eval_node(node.body, ns)

    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float, complex)):
            return node.value
        raise ToolError(INVALID_PARAMS, f"unsupported literal: {node.value!r}")

    if isinstance(node, ast.BinOp):
        op = _BIN_OPS.get(type(node.op))
        if op is None:
            raise ToolError(INVALID_PARAMS, f"unsupported operator: {type(node.op).__name__}")
        left, right = _eval_node(node.left, ns), _eval_node(node.right, ns)
        if isinstance(node.op, ast.Pow) and isinstance(right, (int, float)):
            if abs(right) > _MAX_POW_EXPONENT:
                raise ToolError(INVALID_PARAMS, f"exponent too large: {right}")
        return op(left, right)

    if isinstance(node, ast.UnaryOp):
        op = _UNARY_OPS.get(type(node.op))
        if op is None:
            raise ToolError(INVALID_PARAMS, f"unsupported unary operator: {type(node.op).__name__}")
        return op(_eval_node(node.operand, ns))

    if isinstance(node, ast.Name):
        if node.id not in ns:
            raise ToolError(INVALID_PARAMS, f"unknown name: {node.id}")
        return ns[node.id]

    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name):
            raise ToolError(INVALID_PARAMS, "only direct function calls are allowed")
        fn = ns.get(node.func.id)
        if fn is None or not callable(fn):
            raise ToolError(INVALID_PARAMS, f"unknown function: {node.func.id}")
        if node.keywords:
            raise ToolError(INVALID_PARAMS, "keyword arguments are not supported")
        return fn(*[_eval_node(a, ns) for a in node.args])

    raise ToolError(INVALID_PARAMS, f"unsupported expression: {type(node).__name__}")


def safe_eval(expression: str, ns: dict[str, Any] | None = None) -> Any:
    """eval() 없이 산술식을 계산한다."""
    try:
        tree = ast.parse(expression, mode="eval")
    except SyntaxError as exc:
        raise ToolError(INVALID_PARAMS, f"invalid expression: {exc.msg}") from exc

    try:
        return _eval_node(tree, ns or {})
    except ToolError:
        raise
    except ZeroDivisionError as exc:
        raise ToolError(EXECUTION_ERROR, "division by zero") from exc
    except (OverflowError, ValueError) as exc:
        raise ToolError(EXECUTION_ERROR, str(exc)) from exc


def _fmt(value: Any) -> str:
    if isinstance(value, float) and value.is_integer() and abs(value) < 1e15:
        return str(value)
    return str(value)


def calculator(expression: str) -> str:
    """사칙연산만 (변수/함수 없음)."""
    return _fmt(safe_eval(expression, {}))


def calculate(expression: str) -> str:
    """math 라이브러리 화이트리스트 포함."""
    return _fmt(safe_eval(expression, dict(_MATH_NS)))


# ---- unit_convert ----------------------------------------------------------
# 각 단위를 SI 기준 단위로 환산하는 계수. 온도는 선형이 아니라 별도 처리.
_UNITS: dict[str, tuple[str, float]] = {
    # 길이 (m)
    "mm": ("length", 1e-3), "cm": ("length", 1e-2), "m": ("length", 1.0),
    "km": ("length", 1e3), "in": ("length", 0.0254), "ft": ("length", 0.3048),
    "yd": ("length", 0.9144), "mi": ("length", 1609.344),
    # 무게 (kg)
    "mg": ("mass", 1e-6), "g": ("mass", 1e-3), "kg": ("mass", 1.0),
    "t": ("mass", 1e3), "oz": ("mass", 0.028349523125), "lb": ("mass", 0.45359237),
    # 부피 (L)
    "ml": ("volume", 1e-3), "l": ("volume", 1.0), "gal": ("volume", 3.785411784),
    # 시간 (s)
    "ms": ("time", 1e-3), "s": ("time", 1.0), "min": ("time", 60.0),
    "h": ("time", 3600.0), "day": ("time", 86400.0),
    # 데이터 (byte)
    "b": ("data", 1.0), "kb": ("data", 1e3), "mb": ("data", 1e6),
    "gb": ("data", 1e9), "tb": ("data", 1e12),
    "kib": ("data", 1024.0), "mib": ("data", 1024.0**2), "gib": ("data", 1024.0**3),
}
_TEMP = {"c", "f", "k"}


def _to_celsius(value: float, unit: str) -> float:
    return {"c": value, "f": (value - 32.0) * 5.0 / 9.0, "k": value - 273.15}[unit]


def _from_celsius(value: float, unit: str) -> float:
    return {"c": value, "f": value * 9.0 / 5.0 + 32.0, "k": value + 273.15}[unit]


def unit_convert(value: float, from_unit: str, to_unit: str) -> str:
    src, dst = from_unit.strip().lower(), to_unit.strip().lower()

    if src in _TEMP or dst in _TEMP:
        if not (src in _TEMP and dst in _TEMP):
            raise ToolError(INVALID_PARAMS, f"cannot convert between {from_unit} and {to_unit}")
        return f"{_from_celsius(_to_celsius(float(value), src), dst):.4g} {to_unit}"

    if src not in _UNITS:
        raise ToolError(INVALID_PARAMS, f"unknown unit: {from_unit}")
    if dst not in _UNITS:
        raise ToolError(INVALID_PARAMS, f"unknown unit: {to_unit}")

    src_dim, src_factor = _UNITS[src]
    dst_dim, dst_factor = _UNITS[dst]
    if src_dim != dst_dim:
        raise ToolError(
            INVALID_PARAMS, f"cannot convert {src_dim} ({from_unit}) to {dst_dim} ({to_unit})"
        )
    return f"{float(value) * src_factor / dst_factor:.6g} {to_unit}"


def datetime_now(timezone: str = "local", fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    tz = _dt.timezone.utc if timezone.lower() in ("utc", "gmt") else None
    now = _dt.datetime.now(tz)
    label = "UTC" if tz else "local"
    return f"{now.strftime(fmt)} ({label}, {now.strftime('%A')})"


TOOLS: list[ToolSpec] = [
    ToolSpec(
        name="calculator",
        description="Evaluate a basic arithmetic expression (+, -, *, /, //, %, **).",
        schema={
            "type": "object",
            "properties": {"expression": {"type": "string", "description": "e.g. '2 + 3 * 4'"}},
            "required": ["expression"],
        },
        fn=calculator, tags=("compute",),
    ),
    ToolSpec(
        name="calculate",
        description=(
            "Evaluate a math expression with the math library available "
            "(sqrt, log, sin, pi, e, factorial, ...)."
        ),
        schema={
            "type": "object",
            "properties": {"expression": {"type": "string", "description": "e.g. 'sqrt(144) + pi'"}},
            "required": ["expression"],
        },
        fn=calculate, tags=("compute",),
    ),
    ToolSpec(
        name="unit_convert",
        description="Convert a value between units (length, mass, volume, time, data, temperature).",
        schema={
            "type": "object",
            "properties": {
                "value": {"type": "number", "description": "Numeric value to convert"},
                "from_unit": {"type": "string", "description": "e.g. 'km', 'lb', 'c', 'gib'"},
                "to_unit": {"type": "string", "description": "Target unit"},
            },
            "required": ["value", "from_unit", "to_unit"],
        },
        fn=unit_convert, tags=("compute",),
    ),
    ToolSpec(
        name="datetime",
        description="Get the current date and time.",
        schema={
            "type": "object",
            "properties": {
                "timezone": {"type": "string", "description": "'local' or 'utc'", "default": "local"},
                "fmt": {"type": "string", "description": "strftime format", "default": "%Y-%m-%d %H:%M:%S"},
            },
        },
        fn=datetime_now, tags=("system",),
    ),
]
