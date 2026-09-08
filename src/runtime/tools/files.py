"""YUA Runtime — File 도구: file_read, file_write, json_parse, grep_search, pdf_read.

모든 경로는 workspace root 아래로 강제된다. 모델이 ../../etc/passwd 같은 경로를
만들어내도 root 밖으로 나갈 수 없다.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from .base import EXECUTION_ERROR, INVALID_PARAMS, NOT_FOUND, ToolError, ToolSpec

__all__ = ["TOOLS", "set_workspace", "get_workspace", "resolve_in_workspace"]

_MAX_READ_BYTES = 256 * 1024      # 한 번에 모델 컨텍스트로 들어갈 상한
_MAX_GREP_MATCHES = 100

# 기본 workspace = 환경변수 또는 ~/yua-workspace
_workspace: Path = Path(os.environ.get("YUA_WORKSPACE", Path.home() / "yua-workspace"))


def set_workspace(path: str | Path) -> Path:
    """도구가 접근할 수 있는 루트 디렉터리를 지정한다."""
    global _workspace
    _workspace = Path(path).expanduser().resolve()
    _workspace.mkdir(parents=True, exist_ok=True)
    return _workspace


def get_workspace() -> Path:
    return _workspace


def resolve_in_workspace(path: str) -> Path:
    """workspace 밖으로 나가는 경로를 거부한다 (심볼릭 링크 포함)."""
    root = _workspace.resolve()
    root.mkdir(parents=True, exist_ok=True)
    candidate = Path(path).expanduser()
    full = (candidate if candidate.is_absolute() else root / candidate).resolve()

    if full != root and root not in full.parents:
        raise ToolError(
            INVALID_PARAMS,
            f"path escapes workspace: {path!r}. allowed root is {root}",
        )
    return full


def file_read(path: str, max_bytes: int = _MAX_READ_BYTES) -> str:
    full = resolve_in_workspace(path)
    if not full.exists():
        raise ToolError(NOT_FOUND, f"file not found: {path}")
    if full.is_dir():
        entries = sorted(p.name + ("/" if p.is_dir() else "") for p in full.iterdir())
        return f"[directory] {path}\n" + "\n".join(entries[:200])

    data = full.read_bytes()[: max(1, int(max_bytes))]
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        text = data.decode("utf-8", errors="replace")
    truncated = full.stat().st_size > len(data)
    return text + ("\n...[truncated]" if truncated else "")


def file_write(path: str, content: str, mode: str = "overwrite") -> str:
    full = resolve_in_workspace(path)
    full.parent.mkdir(parents=True, exist_ok=True)
    with full.open("a" if mode == "append" else "w", encoding="utf-8") as fh:
        fh.write(content)
    return f"wrote {len(content)} chars to {full.relative_to(_workspace.resolve())} ({mode})"


def json_parse(text: str, path: str = "") -> str:
    """JSON을 파싱하고, path가 주어지면 'a.b.0.c' 형태로 값을 추출한다."""
    try:
        data: Any = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ToolError(INVALID_PARAMS, f"invalid JSON at line {exc.lineno}: {exc.msg}") from exc

    if not path:
        return json.dumps(data, ensure_ascii=False, indent=2)[:_MAX_READ_BYTES]

    cursor: Any = data
    for part in path.split("."):
        if isinstance(cursor, list):
            if not part.lstrip("-").isdigit():
                raise ToolError(NOT_FOUND, f"expected list index at '{part}' in path '{path}'")
            idx = int(part)
            if not -len(cursor) <= idx < len(cursor):
                raise ToolError(NOT_FOUND, f"index {idx} out of range at '{path}'")
            cursor = cursor[idx]
        elif isinstance(cursor, dict):
            if part not in cursor:
                raise ToolError(
                    NOT_FOUND,
                    f"key '{part}' not found. available: {', '.join(list(cursor)[:10])}",
                )
            cursor = cursor[part]
        else:
            raise ToolError(NOT_FOUND, f"cannot descend into {type(cursor).__name__} at '{part}'")

    return json.dumps(cursor, ensure_ascii=False, indent=2) if isinstance(cursor, (dict, list)) else str(cursor)


def grep_search(pattern: str, path: str = ".", glob: str = "*", max_results: int = 50) -> str:
    root = resolve_in_workspace(path)
    if not root.exists():
        raise ToolError(NOT_FOUND, f"path not found: {path}")

    try:
        regex = re.compile(pattern)
    except re.error as exc:
        raise ToolError(INVALID_PARAMS, f"invalid regex: {exc}") from exc

    limit = min(int(max_results), _MAX_GREP_MATCHES)
    files = [root] if root.is_file() else sorted(p for p in root.rglob(glob) if p.is_file())

    hits: list[str] = []
    for file in files:
        try:
            with file.open("r", encoding="utf-8", errors="ignore") as fh:
                for lineno, line in enumerate(fh, 1):
                    if regex.search(line):
                        rel = file.relative_to(_workspace.resolve())
                        hits.append(f"{rel}:{lineno}: {line.rstrip()[:200]}")
                        if len(hits) >= limit:
                            return "\n".join(hits) + f"\n...[stopped at {limit} matches]"
        except OSError:
            continue

    return "\n".join(hits) if hits else f"no matches for {pattern!r}"


def pdf_read(path: str, max_pages: int = 20) -> str:
    full = resolve_in_workspace(path)
    if not full.exists():
        raise ToolError(NOT_FOUND, f"file not found: {path}")
    try:
        from pypdf import PdfReader
    except ImportError as exc:  # 선택 의존성 — 없으면 모델이 이해할 메시지를 준다
        raise ToolError(
            EXECUTION_ERROR, "pdf_read requires the 'pypdf' package (pip install pypdf)"
        ) from exc

    reader = PdfReader(str(full))
    pages = [(p.extract_text() or "") for p in reader.pages[: int(max_pages)]]
    return "\n\n".join(f"[page {i}]\n{t}" for i, t in enumerate(pages, 1))[:_MAX_READ_BYTES]


TOOLS: list[ToolSpec] = [
    ToolSpec(
        name="file_read",
        description="Read a text file (or list a directory) inside the workspace.",
        schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Path relative to the workspace root"},
                "max_bytes": {"type": "integer", "default": _MAX_READ_BYTES},
            },
            "required": ["path"],
        },
        fn=file_read, tags=("files",),
    ),
    ToolSpec(
        name="file_write",
        description="Write text to a file inside the workspace.",
        schema={
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "content": {"type": "string"},
                "mode": {"type": "string", "enum": ["overwrite", "append"], "default": "overwrite"},
            },
            "required": ["path", "content"],
        },
        fn=file_write, needs_approval=True, tags=("files",),
    ),
    ToolSpec(
        name="json_parse",
        description="Parse JSON text and optionally extract a dotted key path like 'items.0.name'.",
        schema={
            "type": "object",
            "properties": {
                "text": {"type": "string"},
                "path": {"type": "string", "description": "Dotted path, empty for whole document", "default": ""},
            },
            "required": ["text"],
        },
        fn=json_parse, tags=("files",),
    ),
    ToolSpec(
        name="grep_search",
        description="Search files under the workspace with a regular expression.",
        schema={
            "type": "object",
            "properties": {
                "pattern": {"type": "string", "description": "Python regular expression"},
                "path": {"type": "string", "default": "."},
                "glob": {"type": "string", "description": "e.g. '*.py'", "default": "*"},
                "max_results": {"type": "integer", "default": 50},
            },
            "required": ["pattern"],
        },
        fn=grep_search, tags=("files",),
    ),
    ToolSpec(
        name="pdf_read",
        description="Extract text from a PDF file in the workspace.",
        schema={
            "type": "object",
            "properties": {"path": {"type": "string"}, "max_pages": {"type": "integer", "default": 20}},
            "required": ["path"],
        },
        fn=pdf_read, tags=("files",),
    ),
]
