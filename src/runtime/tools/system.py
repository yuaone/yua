"""YUA Runtime — System 도구: shell, git_ops, execute, pytest.

이 파일의 도구는 전부 승인 게이트 뒤에 있다 (execute/pytest/shell).
git_ops만 읽기 서브커맨드에 한해 승인 없이 돈다.

주의: execute는 '샌드박스'가 아니다. 별도 프로세스 + 타임아웃 + workspace cwd일 뿐이며,
      승인 없이 자동 실행되면 안 된다.
"""

from __future__ import annotations

import shlex
import subprocess
import sys

from .base import EXECUTION_ERROR, INVALID_PARAMS, TIMEOUT, ToolError, ToolSpec
from .files import get_workspace, resolve_in_workspace

__all__ = ["TOOLS", "GIT_READ_ONLY"]

_MAX_OUTPUT = 32_000

# 승인 없이 허용되는 git 서브커맨드 (읽기 전용)
GIT_READ_ONLY: frozenset[str] = frozenset({
    "status", "log", "diff", "show", "branch", "remote", "tag",
    "describe", "blame", "shortlog", "rev-parse", "ls-files",
})

# shell에서 통째로 거부하는 실행 파일 — 되돌릴 수 없는 것들
_SHELL_DENY: frozenset[str] = frozenset({
    "rm", "rmdir", "mkfs", "dd", "shutdown", "reboot", "halt",
    "poweroff", "chown", "chmod", "sudo", "su", "kill", "killall",
})


def _run(argv: list[str], timeout_s: float, label: str) -> str:
    try:
        proc = subprocess.run(
            argv,
            cwd=str(get_workspace()),
            capture_output=True,
            text=True,
            timeout=timeout_s,
            check=False,
        )
    except FileNotFoundError as exc:
        raise ToolError(EXECUTION_ERROR, f"command not found: {argv[0]}") from exc
    except subprocess.TimeoutExpired as exc:
        raise ToolError(TIMEOUT, f"{label} exceeded {timeout_s:.0f}s") from exc

    out = (proc.stdout or "") + (("\n[stderr]\n" + proc.stderr) if proc.stderr else "")
    out = out.strip()[:_MAX_OUTPUT] or "(no output)"
    return out if proc.returncode == 0 else f"[exit {proc.returncode}]\n{out}"


def shell(command: str, timeout_s: float = 30.0) -> str:
    """shell=True를 쓰지 않는다 — 파이프/리다이렉션/체이닝이 통하지 않는다."""
    try:
        argv = shlex.split(command)
    except ValueError as exc:
        raise ToolError(INVALID_PARAMS, f"cannot parse command: {exc}") from exc
    if not argv:
        raise ToolError(INVALID_PARAMS, "empty command")

    program = argv[0].rsplit("/", 1)[-1]
    if program in _SHELL_DENY:
        raise ToolError(INVALID_PARAMS, f"command '{program}' is not allowed by YUA's shell policy")

    return _run(argv, float(timeout_s), "shell command")


def git_ops(subcommand: str, args: str = "", timeout_s: float = 30.0) -> str:
    sub = subcommand.strip()
    if not sub:
        raise ToolError(INVALID_PARAMS, "subcommand is required")
    try:
        extra = shlex.split(args) if args else []
    except ValueError as exc:
        raise ToolError(INVALID_PARAMS, f"cannot parse args: {exc}") from exc
    return _run(["git", sub, *extra], float(timeout_s), "git")


def is_git_write(args: dict) -> bool:
    """git_ops 호출이 승인을 필요로 하는지 판단 (레지스트리가 호출)."""
    return str(args.get("subcommand", "")).strip() not in GIT_READ_ONLY


def execute(code: str, timeout_s: float = 30.0) -> str:
    """별도 파이썬 프로세스에서 코드를 실행한다. 승인 필수."""
    return _run([sys.executable, "-c", code], float(timeout_s), "python execution")


def pytest_run(path: str = ".", timeout_s: float = 120.0) -> str:
    full = resolve_in_workspace(path)
    return _run(
        [sys.executable, "-m", "pytest", str(full), "-q", "--no-header"],
        float(timeout_s), "pytest",
    )


TOOLS: list[ToolSpec] = [
    ToolSpec(
        name="shell",
        description=(
            "Run a single shell command in the workspace. No pipes, redirection or chaining; "
            "destructive commands (rm, dd, sudo, ...) are blocked."
        ),
        schema={
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "e.g. 'ls -la src'"},
                "timeout_s": {"type": "number", "default": 30.0},
            },
            "required": ["command"],
        },
        fn=shell, needs_approval=True, timeout_s=35.0, tags=("system",),
    ),
    ToolSpec(
        name="git_ops",
        description=(
            "Run a git subcommand in the workspace. Read-only subcommands "
            "(status, log, diff, show, branch, ...) run without approval."
        ),
        schema={
            "type": "object",
            "properties": {
                "subcommand": {"type": "string", "description": "e.g. 'status', 'log'"},
                "args": {"type": "string", "description": "Extra arguments", "default": ""},
                "timeout_s": {"type": "number", "default": 30.0},
            },
            "required": ["subcommand"],
        },
        fn=git_ops, timeout_s=35.0, tags=("system",),
    ),
    ToolSpec(
        name="execute",
        description="Run Python code in a separate process. Requires approval — not a sandbox.",
        schema={
            "type": "object",
            "properties": {
                "code": {"type": "string"},
                "timeout_s": {"type": "number", "default": 30.0},
            },
            "required": ["code"],
        },
        fn=execute, needs_approval=True, timeout_s=35.0, tags=("compute",),
    ),
    ToolSpec(
        name="pytest",
        description="Run pytest on a path inside the workspace.",
        schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "default": "."},
                "timeout_s": {"type": "number", "default": 120.0},
            },
        },
        fn=pytest_run, needs_approval=True, timeout_s=125.0, tags=("compute",),
    ),
]
