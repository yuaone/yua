"""YUA Runtime — 대화 에이전트.

책임: 시스템 프롬프트 조립 → 생성 → <tool_call> 파싱 → 도구 실행 → 재생성 → 답변.
음성 루프가 문장 단위로 TTS를 시작할 수 있게, 완성된 문장을 콜백으로 흘려보낸다.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Iterator
from dataclasses import dataclass, field
from pathlib import Path

from .chatml import Message, format_tool_response, parse_tool_calls, strip_tool_calls
from .llm import Backend, GenerationConfig
from .memory import Memory
from .tools import REGISTRY, ToolRegistry

__all__ = ["Agent", "AgentConfig", "DEFAULT_PERSONA"]

DEFAULT_PERSONA = """너는 YUA다. 사용자의 개인 AI 비서이며, 로컬 컴퓨터에서 동작한다.

원칙:
- 간결하게 답한다. 음성으로 읽히므로 목록보다 짧은 문장이 낫다.
- 확실하지 않으면 추측하지 말고 도구를 쓰거나 모른다고 말한다.
- 계산, 검색, 파일 읽기, 시간 확인이 필요하면 반드시 도구를 쓴다. 암산하지 않는다.
- 사용자가 쓰는 언어로 답한다.

도구를 쓸 때는 정확히 이 형식으로 출력한다:
<tool_call>
{"name": "도구이름", "arguments": {"인자": "값"}}
</tool_call>

도구 결과는 <tool_response> 블록으로 돌아온다. 결과를 받으면 그것을 근거로 답한다."""

# 문장 끝 — TTS를 조기에 시작하기 위한 경계.
# search()로 찾아 m.end()에서 자르므로 구두점은 앞 문장에 남는다.
_SENTENCE_END = re.compile(r"(?<=[.!?。！？…])\s+|(?<=[다요죠임함])\.\s*|\n\n")


class _SentenceEmitter:
    """스트리밍 조각을 모아 완성된 문장 단위로 콜백을 호출한다."""

    def __init__(self, callback: Callable[[str], None]) -> None:
        self._cb = callback
        self._pending = ""

    def reset(self) -> None:
        """도구 호출 라운드에서 남은 조각을 버린다 (대개 <tool_call>의 앞부분)."""
        self._pending = ""

    def feed(self, chunk: str) -> None:
        self._pending += chunk
        while match := _SENTENCE_END.search(self._pending):
            head, self._pending = self._pending[: match.end()], self._pending[match.end() :]
            if clean := strip_tool_calls(head):
                self._cb(clean)

    def flush(self) -> None:
        if clean := strip_tool_calls(self._pending):
            self._cb(clean)
        self._pending = ""


@dataclass
class AgentConfig:
    persona: str = DEFAULT_PERSONA
    max_tool_rounds: int = 4
    max_history: int = 20              # 시스템 프롬프트 제외, 유지할 최근 턴 수
    enabled_tools: tuple[str, ...] | None = None
    generation: GenerationConfig = field(default_factory=GenerationConfig)
    memory_path: str | Path | None = None


class Agent:
    """상태를 가진 대화 루프."""

    def __init__(
        self,
        backend: Backend,
        config: AgentConfig | None = None,
        registry: ToolRegistry | None = None,
    ) -> None:
        self.backend = backend
        self.config = config or AgentConfig()
        self.registry = registry or REGISTRY
        self.memory = Memory(self.config.memory_path) if self.config.memory_path else None
        self.history: list[Message] = []

    # -- 프롬프트 --------------------------------------------------------
    def _system_message(self, user_text: str) -> Message:
        blocks = [self.config.persona, self.registry.prompt_block(self.config.enabled_tools)]
        if self.memory is not None and (
            recalled := self.memory.as_context(user_text, exclude_recent=2)
        ):
            blocks.append(recalled)
        return Message("system", "\n\n".join(blocks))

    def _trim(self) -> None:
        if len(self.history) > self.config.max_history:
            self.history = self.history[-self.config.max_history :]

    # -- 실행 ------------------------------------------------------------
    def _run_tools(self, calls) -> Message:
        results = [
            self.registry.execute(c.name, c.arguments, c.id).to_dict() for c in calls
        ]
        return Message("tool", format_tool_response(results))

    def chat(
        self,
        user_text: str,
        on_sentence: Callable[[str], None] | None = None,
        on_tool: Callable[[str, dict], None] | None = None,
    ) -> str:
        """한 턴을 처리하고 최종 평문 답변을 돌려준다.

        on_sentence: 문장이 완성될 때마다 호출 (TTS 조기 시작용)
        on_tool:     도구를 실행하기 직전에 호출 (UI 표시용)
        """
        self.history.append(Message("user", user_text))
        if self.memory is not None:
            self.memory.append("user", user_text)

        emitter = _SentenceEmitter(on_sentence) if on_sentence else None
        answer = ""

        for round_index in range(self.config.max_tool_rounds + 1):
            messages = [self._system_message(user_text), *self.history]
            # 마지막 라운드에서는 도구를 더 못 쓰게 하고 답을 강제한다
            is_final = round_index == self.config.max_tool_rounds

            if emitter is not None:
                emitter.reset()

            buffer = ""
            for chunk in self.backend.stream(messages, self.config.generation):
                buffer += chunk
                # 도구 호출이 시작되면 그 뒤 텍스트는 말하지 않는다
                if emitter is not None and "<tool_call>" not in buffer:
                    emitter.feed(chunk)

            calls = parse_tool_calls(buffer) if not is_final else []
            plain = strip_tool_calls(buffer)

            if not calls:
                answer = plain
                if emitter is not None:
                    emitter.flush()
                self.history.append(Message("assistant", answer))
                break

            self.history.append(Message("assistant", plain, tool_calls=calls))
            for call in calls:
                if on_tool:
                    on_tool(call.name, call.arguments)
            self.history.append(self._run_tools(calls))

        if self.memory is not None:
            self.memory.append("assistant", answer)
        self._trim()
        return answer

    def stream_chat(self, user_text: str) -> Iterator[str]:
        """문장 단위 이터레이터로 감싼 버전."""
        queue: list[str] = []
        self.chat(user_text, on_sentence=queue.append)
        yield from queue

    def reset(self) -> None:
        self.history.clear()
