"""YUA Runtime — 도구 레지스트리.

docs/TOOL_CALL_API.md의 16개 도구를 한 곳에 모으고,
검증 → 승인 → 실행 → 구조화된 결과 반환까지 담당한다.

Usage:
    from src.runtime.tools import REGISTRY
    result = REGISTRY.execute("calculate", {"expression": "sqrt(144)"}, call_id="call_0001")
    print(result.to_dict())
"""

from __future__ import annotations

import time
from collections.abc import Callable, Iterable
from typing import Any

from . import compute, files, system, web_search
from .base import (
    APPROVAL_DENIED,
    EXECUTION_ERROR,
    NOT_FOUND,
    ToolError,
    ToolResult,
    ToolSpec,
    validate_params,
)
from .files import get_workspace, set_workspace

__all__ = [
    "REGISTRY", "ToolRegistry", "ToolResult", "ToolSpec", "ToolError",
    "set_workspace", "get_workspace", "always_deny", "always_allow", "ask_on_console",
]

# 승인 콜백: (도구 이름, 인자) -> 허용 여부
ApprovalFn = Callable[[str, dict[str, Any]], bool]


def always_deny(name: str, args: dict[str, Any]) -> bool:
    """기본값. 승인이 필요한 도구는 명시적으로 켜기 전까지 실행되지 않는다."""
    return False


def always_allow(name: str, args: dict[str, Any]) -> bool:
    """신뢰하는 로컬 환경 전용."""
    return True


def ask_on_console(name: str, args: dict[str, Any]) -> bool:
    """터미널에서 y/N으로 물어본다."""
    preview = ", ".join(f"{k}={v!r}"[:80] for k, v in args.items())
    try:
        answer = input(f"\n  ⚠️  YUA가 '{name}' 실행을 요청합니다 ({preview})\n     허용할까요? [y/N] ")
    except (EOFError, KeyboardInterrupt):
        return False
    return answer.strip().lower() in ("y", "yes", "ㅛ")


class ToolRegistry:
    """이름 → ToolSpec 매핑과 실행 파이프라인."""

    def __init__(self, specs: Iterable[ToolSpec], approval: ApprovalFn = always_deny) -> None:
        self._specs: dict[str, ToolSpec] = {s.name: s for s in specs}
        self.approval = approval

    # -- 조회 --------------------------------------------------------------
    def __contains__(self, name: object) -> bool:
        return name in self._specs

    def __len__(self) -> int:
        return len(self._specs)

    @property
    def names(self) -> list[str]:
        return sorted(self._specs)

    def get(self, name: str) -> ToolSpec | None:
        return self._specs.get(name)

    def openai_schema(self, only: Iterable[str] | None = None) -> list[dict[str, Any]]:
        """OpenAI 호환 tools 배열."""
        wanted = set(only) if only is not None else set(self._specs)
        return [s.to_openai() for n, s in sorted(self._specs.items()) if n in wanted]

    def prompt_block(self, only: Iterable[str] | None = None) -> str:
        """시스템 프롬프트에 넣을 <tools> 블록 (ChatML 네이티브 포맷)."""
        import json

        lines = ["<tools>"]
        for spec in self.openai_schema(only):
            lines.append(json.dumps(spec, ensure_ascii=False))
        lines.append("</tools>")
        return "\n".join(lines)

    # -- 실행 --------------------------------------------------------------
    def _needs_approval(self, spec: ToolSpec, args: dict[str, Any]) -> bool:
        if spec.name == "git_ops":          # 읽기 서브커맨드는 통과시킨다
            return system.is_git_write(args)
        return spec.needs_approval

    def execute(self, name: str, args: dict[str, Any], call_id: str = "call_0001") -> ToolResult:
        """검증 → 승인 → 실행. 예외를 던지지 않고 항상 ToolResult를 돌려준다."""
        started = time.perf_counter()

        spec = self._specs.get(name)
        if spec is None:
            return ToolResult.fail(
                call_id, name, NOT_FOUND,
                f"unknown tool: {name}. available: {', '.join(self.names)}", started,
            )

        try:
            cleaned = validate_params(spec.schema, args)
        except ToolError as exc:
            return ToolResult.fail(call_id, name, exc.error_type, exc.message, started)

        if self._needs_approval(spec, cleaned) and not self.approval(name, cleaned):
            return ToolResult.fail(
                call_id, name, APPROVAL_DENIED,
                f"user did not approve execution of '{name}'", started,
            )

        try:
            output = spec.fn(**cleaned)
        except ToolError as exc:
            return ToolResult.fail(call_id, name, exc.error_type, exc.message, started)
        except Exception as exc:  # 도구 버그가 대화 전체를 죽이지 않게 한다
            return ToolResult.fail(
                call_id, name, EXECUTION_ERROR, f"{type(exc).__name__}: {exc}", started,
            )

        return ToolResult.ok(call_id, name, str(output), started)


ALL_SPECS: list[ToolSpec] = [
    *compute.TOOLS,        # calculator, calculate, unit_convert, datetime
    *files.TOOLS,          # file_read, file_write, json_parse, grep_search, pdf_read
    *system.TOOLS,         # shell, git_ops, execute, pytest
    *web_search.TOOLS,     # web_search, url_fetch, http_request
]

REGISTRY = ToolRegistry(ALL_SPECS)
