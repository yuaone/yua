"""YUA Runtime — LLM 백엔드 추상화.

세 가지 중 무엇이든 같은 인터페이스로 쓴다:
  1. llama-cpp-python  — GGUF 파일을 인프로세스로 (CPU/Metal/CUDA 자동)
  2. OpenAI 호환 서버  — Ollama, LM Studio, llama.cpp server, vLLM
  3. EchoBackend       — 모델 없이 배선만 점검할 때

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

from .chatml import STOP_STRINGS, Message, render_chatml

__all__ = ["Backend", "LlamaCppBackend", "OpenAIBackend", "EchoBackend", "GenerationConfig", "load_backend"]


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
    **kwargs,
) -> Backend:
    """설정에 따라 알맞은 백엔드를 고른다.

    우선순위: GGUF 경로 > OpenAI 호환 URL > 환경변수 > Echo
    """
    model_path = model_path or os.environ.get("YUA_GGUF")
    base_url = base_url or os.environ.get("YUA_BASE_URL")
    model = model or os.environ.get("YUA_MODEL", "qwen3:8b")

    if model_path:
        return LlamaCppBackend(model_path, **kwargs)
    if base_url:
        return OpenAIBackend(base_url=base_url, model=model, **kwargs)
    return EchoBackend()
