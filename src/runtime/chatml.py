"""YUA Runtime — ChatML 렌더링 + <tool_call> 파싱.

docs/TOOL_CALL_API.md의 네이티브 포맷:

    <tool_call>
    {"name": "calculate", "arguments": {"expression": "sqrt(144)"}}
    </tool_call>

결과는 <tool_response> 블록으로 되돌린다.
special token 문자열은 src/token_protocol.py를 단일 출처로 삼는다.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from ..token_protocol import IM_END, IM_START

__all__ = [
    "Message", "ToolCall", "render_chatml", "parse_tool_calls",
    "strip_tool_calls", "format_tool_response", "STOP_STRINGS",
]

TOOL_CALL_OPEN = "<tool_call>"
TOOL_CALL_CLOSE = "</tool_call>"
TOOL_RESPONSE_OPEN = "<tool_response>"
TOOL_RESPONSE_CLOSE = "</tool_response>"

# 생성 중단 문자열 — 백엔드에 그대로 넘긴다
STOP_STRINGS: tuple[str, ...] = (IM_END, TOOL_CALL_CLOSE)

_TOOL_CALL_RE = re.compile(
    re.escape(TOOL_CALL_OPEN) + r"\s*(?P<body>.*?)\s*(?:" + re.escape(TOOL_CALL_CLOSE) + r"|$)",
    re.S,
)
_THINK_RE = re.compile(r"<think>.*?</think>", re.S)


@dataclass(frozen=True)
class ToolCall:
    """모델이 요청한 도구 호출 하나."""

    id: str
    name: str
    arguments: dict[str, Any]

    def to_openai(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": "function",
            "function": {"name": self.name, "arguments": json.dumps(self.arguments, ensure_ascii=False)},
        }


@dataclass
class Message:
    """대화 한 턴. role은 system | user | assistant | tool."""

    role: str
    content: str = ""
    tool_calls: list[ToolCall] | None = None
    name: str = ""          # role="tool"일 때 도구 이름

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {"role": self.role, "content": self.content}
        if self.tool_calls:
            d["tool_calls"] = [tc.to_openai() for tc in self.tool_calls]
        if self.name:
            d["name"] = self.name
        return d


def render_chatml(messages: list[Message], add_generation_prompt: bool = True) -> str:
    """메시지 목록을 ChatML 문자열로 만든다.

    tool 역할은 <tool_response> 블록을 담은 user 턴으로 접는다 —
    대부분의 오픈 모델이 별도의 tool 역할을 학습하지 않았기 때문이다.
    """
    parts: list[str] = []
    for msg in messages:
        role = msg.role
        body = msg.content

        if role == "tool":
            role = "user"
            body = f"{TOOL_RESPONSE_OPEN}\n{msg.content}\n{TOOL_RESPONSE_CLOSE}"
        elif role == "assistant" and msg.tool_calls:
            calls = "\n".join(
                f"{TOOL_CALL_OPEN}\n"
                f'{json.dumps({"name": tc.name, "arguments": tc.arguments}, ensure_ascii=False)}\n'
                f"{TOOL_CALL_CLOSE}"
                for tc in msg.tool_calls
            )
            body = f"{body}\n{calls}".strip()

        parts.append(f"{IM_START}{role}\n{body}{IM_END}\n")

    if add_generation_prompt:
        parts.append(f"{IM_START}assistant\n")
    return "".join(parts)


def parse_tool_calls(text: str, start_index: int = 1) -> list[ToolCall]:
    """생성 결과에서 <tool_call> 블록을 뽑아낸다.

    닫는 태그가 없어도(스톱 문자열에 걸려 잘린 경우) 파싱한다.
    JSON이 깨진 블록은 조용히 건너뛴다 — 모델이 다음 턴에 다시 시도하게 둔다.
    """
    calls: list[ToolCall] = []
    for match in _TOOL_CALL_RE.finditer(text):
        raw = match.group("body").strip()
        if not raw:
            continue
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if not isinstance(payload, dict) or "name" not in payload:
            continue

        args = payload.get("arguments", payload.get("parameters", {}))
        if isinstance(args, str):                 # 일부 모델은 arguments를 문자열로 낸다
            try:
                args = json.loads(args)
            except json.JSONDecodeError:
                args = {}
        if not isinstance(args, dict):
            args = {}

        calls.append(ToolCall(
            id=f"call_{start_index + len(calls):04d}",
            name=str(payload["name"]),
            arguments=args,
        ))
    return calls


def strip_tool_calls(text: str) -> str:
    """사용자/TTS에게 보낼 평문만 남긴다 (<tool_call>, <think> 제거)."""
    cleaned = _TOOL_CALL_RE.sub("", text)
    cleaned = _THINK_RE.sub("", cleaned)
    cleaned = cleaned.replace(IM_END, "").replace(TOOL_CALL_OPEN, "").replace(TOOL_CALL_CLOSE, "")
    return re.sub(r"\n{3,}", "\n\n", cleaned).strip()


def format_tool_response(results: list[dict[str, Any]]) -> str:
    """ToolResult.to_dict() 목록을 모델에게 돌려줄 문자열로 만든다."""
    return "\n".join(json.dumps(r, ensure_ascii=False) for r in results)
