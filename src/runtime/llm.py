"""YUA Runtime — LLM 백엔드 추상화.

네 가지 중 무엇이든 같은 인터페이스로 쓴다:
  1. llama-cpp-python  — GGUF 파일을 인프로세스로 (CPU/Metal/CUDA 자동)
  2. OpenAI 호환 서버  — Ollama, LM Studio, llama.cpp server, vLLM
  3. ACP               — 이미 깔린 claude/gemini CLI를 구독으로 (다운로드 0바이트)
  4. EchoBackend       — 모델 없이 배선만 점검할 때

자체 학습한 YUA 체크포인트가 준비되면 Backend 하나만 추가하면 된다.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from abc import ABC, abstractmethod
from collections.abc import Iterator
from dataclasses import dataclass, field

from .acp import ACPSession, resolve_agent_command
from .chatml import STOP_STRINGS, Message, render_chatml

__all__ = [
    "Backend", "LlamaCppBackend", "OpenAIBackend", "ACPBackend", "EchoBackend",
    "GenerationConfig", "load_backend",
]


@dataclass
class GenerationConfig:
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 512
    repeat_penalty: float = 1.05
    stop: tuple[str, ...] = field(default_factory=lambda: STOP_STRINGS)


class Backend(ABC):
    """모든 백엔드가 만족해야 하는 최소 인터페이스."""

    name: str = "backend"

    @abstractmethod
    def stream(self, messages: list[Message], config: GenerationConfig) -> Iterator[str]:
        """토큰(또는 조각)을 순서대로 내보낸다."""

    def generate(self, messages: list[Message], config: GenerationConfig) -> str:
        return "".join(self.stream(messages, config))


class LlamaCppBackend(Backend):
    """GGUF를 인프로세스로 실행한다. GPU 없이도 동작한다."""

    name = "llama.cpp"

    def __init__(
        self,
        model_path: str,
        n_ctx: int = 8192,
        n_threads: int | None = None,
        n_gpu_layers: int = -1,
        verbose: bool = False,
    ) -> None:
        try:
            from llama_cpp import Llama
        except ImportError as exc:
            raise RuntimeError(
                "llama-cpp-python이 필요합니다.\n"
                "  CPU:   pip install llama-cpp-python\n"
                "  Metal: CMAKE_ARGS='-DGGML_METAL=on' pip install llama-cpp-python"
            ) from exc

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"GGUF 파일을 찾을 수 없습니다: {model_path}")

        self.model_path = model_path
        # n_gpu_layers=-1은 가능한 만큼 오프로드, GPU가 없으면 자동으로 CPU
        self._llm = Llama(
            model_path=model_path,
            n_ctx=n_ctx,
            n_threads=n_threads or max(1, (os.cpu_count() or 4) - 1),
            n_gpu_layers=n_gpu_layers,
            verbose=verbose,
        )

    def stream(self, messages: list[Message], config: GenerationConfig) -> Iterator[str]:
        prompt = render_chatml(messages)
        for chunk in self._llm(
            prompt,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            top_p=config.top_p,
            repeat_penalty=config.repeat_penalty,
            stop=list(config.stop),
            stream=True,
        ):
            text = chunk["choices"][0]["text"]
            if text:
                yield text


class OpenAIBackend(Backend):
    """Ollama / LM Studio / llama.cpp server / vLLM 공용. stdlib만 사용한다."""

    name = "openai-compatible"

    def __init__(
        self,
        base_url: str = "http://localhost:11434/v1",
        model: str = "qwen3:8b",
        api_key: str = "not-needed",
        timeout_s: float = 120.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.timeout_s = timeout_s

    def stream(self, messages: list[Message], config: GenerationConfig) -> Iterator[str]:
        payload = {
            "model": self.model,
            "messages": [m.to_dict() for m in messages],
            "temperature": config.temperature,
            "top_p": config.top_p,
            "max_tokens": config.max_tokens,
            "stream": True,
        }
        req = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout_s) as resp:  # noqa: S310
                for raw in resp:
                    line = raw.decode("utf-8").strip()
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        return
                    try:
                        delta = json.loads(data)["choices"][0].get("delta", {})
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
                    if content := delta.get("content"):
                        yield content
        except urllib.error.URLError as exc:
            raise RuntimeError(
                f"LLM 서버에 연결할 수 없습니다 ({self.base_url}): {exc.reason}\n"
                f"  Ollama를 쓰신다면: ollama serve && ollama pull {self.model}"
            ) from exc


class ACPBackend(Backend):
    """이미 설치된 공식 CLI를 구독 계정으로 빌려 쓴다.

    모델 파일을 받지 않으므로 디스크와 램이 부족한 기기에서도 동작한다.
    자격증명은 CLI가 자기 홈 디렉터리에 들고 있고, 이 코드는 그것을 보지 않는다.
    """

    name = "acp"

    def __init__(
        self,
        agent: str = "claude",
        command: str | None = None,
        cwd: str | None = None,
        timeout_s: float = 180.0,
        approve_tools: bool = False,
        debug: bool = False,
    ) -> None:
        self.agent = agent
        self.argv = resolve_agent_command(agent, command)
        self.name = f"acp:{agent}"
        self._session = ACPSession(
            self.argv,
            cwd=cwd,
            timeout_s=timeout_s,
            # CLI 자체의 도구 승인. YUA 도구는 REGISTRY.approval이 따로 지킨다.
            on_permission=lambda _req: approve_tools,
            debug=debug,
        )
        self._started = False
        self._sent_system = False

    def _ensure_started(self) -> None:
        if not self._started:
            self._session.start()
            self._started = True

    def stream(self, messages: list[Message], config: GenerationConfig) -> Iterator[str]:
        self._ensure_started()
        # ACP 에이전트는 자체 세션 상태를 들고 있으므로 전체 히스토리를 다시 보내지
        # 않는다. 시스템 프롬프트(도구 목록 포함)는 첫 턴에만 앞에 붙인다.
        text = _acp_turn_text(messages, first=not self._sent_system)
        self._sent_system = True
        yield from self._session.prompt(text)

    def close(self) -> None:
        if self._started:
            self._session.close()
            self._started = False


def _acp_turn_text(messages: list[Message], first: bool) -> str:
    """이번 턴에 보낼 텍스트를 만든다.

    도구 결과(role="tool")는 사용자 턴으로 접어 넣는다 — ACP 에이전트는
    YUA의 도구 레지스트리를 모르기 때문이다.
    """
    last_user = next((m for m in reversed(messages) if m.role in ("user", "tool")), None)
    body = last_user.content if last_user else ""

    if last_user is not None and last_user.role == "tool":
        body = f"<tool_response>\n{body}\n</tool_response>"

    if first:
        system = next((m.content for m in messages if m.role == "system"), "")
        if system:
            return f"{system}\n\n---\n\n{body}"
    return body


class EchoBackend(Backend):
    """모델 없이 STT→도구→TTS 배선을 점검하기 위한 더미."""

    name = "echo"

    def stream(self, messages: list[Message], config: GenerationConfig) -> Iterator[str]:
        last = next((m for m in reversed(messages) if m.role == "user"), None)
        yield f"(echo) {last.content if last else ''}"


def load_backend(
    model_path: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
    acp: str | None = None,
    acp_command: str | None = None,
    **kwargs,
) -> Backend:
    """설정에 따라 알맞은 백엔드를 고른다.

    우선순위: ACP > GGUF 경로 > OpenAI 호환 URL > 환경변수 > Echo
    """
    acp = acp or os.environ.get("YUA_ACP")
    model_path = model_path or os.environ.get("YUA_GGUF")
    base_url = base_url or os.environ.get("YUA_BASE_URL")
    model = model or os.environ.get("YUA_MODEL", "qwen3:8b")

    if acp:
        return ACPBackend(agent=acp, command=acp_command, **kwargs)
    if model_path:
        return LlamaCppBackend(model_path, **kwargs)
    if base_url:
        return OpenAIBackend(base_url=base_url, model=model, **kwargs)
    return EchoBackend()
