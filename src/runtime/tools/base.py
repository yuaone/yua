"""YUA Runtime — Tool 실행 기반 타입.

docs/TOOL_CALL_API.md 스펙을 그대로 구현한다.

결과 포맷 (성공):
    {"id", "name", "status": "success", "output", "duration_ms"}
결과 포맷 (실패):
    {"id", "name", "status": "error", "error": {"type", "message"}, "duration_ms"}
"""

from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

__all__ = [
    "ErrorType", "ToolError", "ToolResult", "ToolSpec",
    "validate_params", "APPROVAL_REQUIRED",
]

# docs/TOOL_CALL_API.md — error.type 열거값
ErrorType = str
INVALID_PARAMS: ErrorType = "invalid_params"
TIMEOUT: ErrorType = "timeout"
EXECUTION_ERROR: ErrorType = "execution_error"
NOT_FOUND: ErrorType = "not_found"
APPROVAL_DENIED: ErrorType = "approval_denied"

# 승인이 필요한 도구 (스펙의 Approval=Yes 열)
APPROVAL_REQUIRED: frozenset[str] = frozenset({
    "http_request", "execute", "pytest", "file_write", "shell",
})


class ToolError(Exception):
    """도구 실행 중 발생한, 모델에게 되돌려줄 수 있는 오류."""

    def __init__(self, error_type: ErrorType, message: str) -> None:
        super().__init__(message)
        self.error_type = error_type
        self.message = message


@dataclass(frozen=True)
class ToolResult:
    """모델에게 <tool_response>로 돌아가는 구조화된 결과."""

    id: str
    name: str
    status: str                      # "success" | "error"
    output: str | None = None
    error: dict[str, str] | None = None
    duration_ms: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {"id": self.id, "name": self.name, "status": self.status}
        if self.status == "success":
            d["output"] = self.output
        else:
            d["error"] = self.error
        d["duration_ms"] = round(self.duration_ms, 1)
        return d

    @classmethod
    def ok(cls, call_id: str, name: str, output: str, started: float) -> ToolResult:
        return cls(
            id=call_id, name=name, status="success", output=output,
            duration_ms=(time.perf_counter() - started) * 1000.0,
        )

    @classmethod
    def fail(
        cls, call_id: str, name: str, error_type: ErrorType, message: str, started: float
    ) -> ToolResult:
        return cls(
            id=call_id, name=name, status="error",
            error={"type": error_type, "message": message},
            duration_ms=(time.perf_counter() - started) * 1000.0,
        )


@dataclass(frozen=True)
class ToolSpec:
    """하나의 도구 정의 + 실행 함수.

    schema는 OpenAI function-calling 호환 JSON Schema의 parameters 부분.
    """

    name: str
    description: str
    schema: dict[str, Any]
    fn: Callable[..., str]
    needs_approval: bool = False
    timeout_s: float = 20.0
    tags: tuple[str, ...] = field(default_factory=tuple)

    def to_openai(self) -> dict[str, Any]:
        """OpenAI tools 배열에 넣을 수 있는 형태로 변환."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.schema,
            },
        }


# JSON Schema 중 우리가 실제로 쓰는 부분만 검증한다.
# (jsonschema 의존성을 피하기 위한 의도적 축소 구현)
_TYPES: dict[str, type | tuple[type, ...]] = {
    "string": str,
    "integer": int,
    "number": (int, float),
    "boolean": bool,
    "array": list,
    "object": dict,
}


def validate_params(schema: dict[str, Any], args: dict[str, Any]) -> dict[str, Any]:
    """스펙대로 '실행 전에' 파라미터를 검증하고 기본값을 채운다.

    Raises:
        ToolError: invalid_params — 모델이 스스로 고칠 수 있도록 메시지를 명확히 쓴다.
    """
    if not isinstance(args, dict):
        raise ToolError(INVALID_PARAMS, f"arguments must be an object, got {type(args).__name__}")

    props: dict[str, Any] = schema.get("properties", {})
    required: list[str] = schema.get("required", [])

    for key in required:
        if key not in args:
            raise ToolError(INVALID_PARAMS, f"missing required parameter: {key}")

    unknown = set(args) - set(props)
    if unknown:
        raise ToolError(
            INVALID_PARAMS,
            f"unknown parameter(s): {', '.join(sorted(unknown))}. "
            f"allowed: {', '.join(sorted(props))}",
        )

    cleaned: dict[str, Any] = {}
    for key, spec in props.items():
        if key not in args:
            if "default" in spec:
                cleaned[key] = spec["default"]
            continue

        value = args[key]
        expected = spec.get("type")
        py_type = _TYPES.get(expected) if expected else None

        # bool은 int의 하위 타입이라 integer/number 검사에서 먼저 걸러낸다.
        if expected in ("integer", "number") and isinstance(value, bool):
            raise ToolError(INVALID_PARAMS, f"parameter '{key}' must be {expected}, got boolean")

        if py_type is not None and not isinstance(value, py_type):
            raise ToolError(
                INVALID_PARAMS,
                f"parameter '{key}' must be {expected}, got {type(value).__name__}",
            )

        if "enum" in spec and value not in spec["enum"]:
            raise ToolError(
                INVALID_PARAMS,
                f"parameter '{key}' must be one of {spec['enum']}, got {value!r}",
            )

        cleaned[key] = value

    return cleaned
