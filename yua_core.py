#!/usr/bin/env python3
"""YUA Core — 로컬 음성 비서 진입점.

빠른 시작:
    python yua_core.py --text --acp claude         # 이미 깔린 CLI를 구독으로 (다운로드 0바이트)
    python yua_core.py --text                      # 키보드 모드 (오디오 의존성 불필요)
    python yua_core.py --gguf models/qwen3-8b.gguf # GGUF 음성 모드
    python yua_core.py --base-url http://localhost:11434/v1 --model qwen3:8b

클라우드도, GPU도, API 키도 필요하지 않다.
디스크가 부족하면 --acp 를 쓰면 모델을 하나도 받지 않는다.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.runtime.agent import Agent, AgentConfig          # noqa: E402
from src.runtime.llm import GenerationConfig, load_backend  # noqa: E402
from src.runtime.tools import REGISTRY, always_allow, ask_on_console, set_workspace  # noqa: E402

_COLORS = {
    "user": "\033[36m", "assistant": "\033[32m", "tool": "\033[33m",
    "system": "\033[90m", "error": "\033[31m",
}
_LABELS = {"user": "너", "assistant": "YUA", "tool": "🔧", "system": "·", "error": "✗"}


def make_printer(color: bool = True) -> "callable":
    def emit(kind: str, text: str) -> None:
        label = _LABELS.get(kind, kind)
        if color and sys.stdout.isatty():
            print(f"{_COLORS.get(kind, '')}{label}\033[0m  {text}")
        else:
            print(f"{label}  {text}")
    return emit


def build_agent(args: argparse.Namespace) -> Agent:
    workspace = set_workspace(args.workspace)
    REGISTRY.approval = always_allow if args.yes else ask_on_console

    if args.acp:
        extra = {"acp_command": args.acp_cmd, "cwd": str(workspace)}
    elif args.gguf:
        extra = {"n_ctx": args.ctx}
    else:
        extra = {}

    backend = load_backend(
        acp=args.acp,
        model_path=args.gguf,
        base_url=args.base_url,
        model=args.model,
        **extra,
    )

    config = AgentConfig(
        memory_path=Path(workspace) / "memory.jsonl",
        generation=GenerationConfig(
            temperature=args.temperature,
            max_tokens=args.max_tokens,
        ),
    )
    return Agent(backend, config)


def run_text(agent: Agent, emit) -> None:
    """오디오 없이 배선을 검증하는 모드."""
    emit("system", "텍스트 모드입니다. 빈 줄이나 Ctrl-C로 종료합니다.")
    while True:
        try:
            line = input("\n> ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not line:
            break
        emit("assistant", agent.chat(
            line, on_tool=lambda n, a: emit("tool", f"{n}({a})")
        ))
    emit("system", "종료합니다.")


def run_voice(agent: Agent, args: argparse.Namespace, emit) -> None:
    from src.voice.audio import AudioConfig, Listener
    from src.voice.loop import VoiceLoop
    from src.voice.stt import STTConfig, Transcriber
    from src.voice.tts import load_speaker

    emit("system", f"STT 모델 '{args.whisper}' 로딩 중…")
    transcriber = Transcriber(STTConfig(model_size=args.whisper, language=args.lang))
    speaker = load_speaker(args.tts)
    emit("system", f"TTS: {speaker.name}")
    listener = Listener(AudioConfig(device=args.mic))

    VoiceLoop(agent, transcriber, speaker, listener, on_event=emit).run()


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        prog="yua_core", description="YUA Core — 로컬 음성 비서",
        formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__,
    )
    mode = p.add_argument_group("모드")
    mode.add_argument("--text", action="store_true", help="키보드 모드 (오디오 의존성 없이 테스트)")

    llm = p.add_argument_group("LLM 백엔드")
    llm.add_argument("--acp", metavar="AGENT",
                     help="이미 설치된 CLI를 구독으로 사용: claude | gemini | codex")
    llm.add_argument("--acp-cmd", help="ACP 에이전트 실행 명령 직접 지정")
    llm.add_argument("--gguf", help="GGUF 파일 경로 (llama.cpp 인프로세스)")
    llm.add_argument("--base-url", help="OpenAI 호환 서버 (Ollama: http://localhost:11434/v1)")
    llm.add_argument("--model", default="qwen3:8b", help="서버 모드에서 쓸 모델 이름")
    llm.add_argument("--ctx", type=int, default=8192, help="컨텍스트 길이 (기본 8192)")
    llm.add_argument("--temperature", type=float, default=0.7)
    llm.add_argument("--max-tokens", type=int, default=512)

    voice = p.add_argument_group("음성")
    voice.add_argument("--whisper", default="small", help="tiny|base|small|medium|large-v3-turbo")
    voice.add_argument("--lang", default="ko", help="STT 언어 (auto면 자동 감지)")
    voice.add_argument("--tts", default="auto", help="auto|kokoro|pyttsx3|say|espeak")
    voice.add_argument("--mic", type=int, default=None, help="입력 장치 번호")

    misc = p.add_argument_group("기타")
    misc.add_argument("--workspace", default="~/yua-workspace", help="도구가 접근할 루트")
    misc.add_argument("--yes", action="store_true", help="승인 질문 없이 모든 도구 허용 (주의)")
    misc.add_argument("--list-tools", action="store_true", help="도구 목록만 출력하고 종료")

    args = p.parse_args(argv)
    emit = make_printer()

    if args.list_tools:
        for spec in sorted(REGISTRY.openai_schema(), key=lambda s: s["function"]["name"]):
            fn = spec["function"]
            gate = " (승인 필요)" if REGISTRY.get(fn["name"]).needs_approval else ""
            print(f"  {fn['name']:14} {fn['description']}{gate}")
        return 0

    if args.lang == "auto":
        args.lang = None

    try:
        agent = build_agent(args)
    except (RuntimeError, FileNotFoundError) as exc:
        emit("error", str(exc))
        return 1

    emit("system", f"백엔드: {agent.backend.name} · 도구 {len(REGISTRY)}개 · "
                   f"작업공간 {args.workspace}")
    if agent.backend.name == "echo":
        emit("system", "⚠️  모델이 지정되지 않아 echo 백엔드로 돕니다.")
        emit("system", "    디스크가 부족하면:  --acp claude   (모델 다운로드 없음)")
        emit("system", "    로컬 모델을 쓰려면: --gguf 또는 --base-url")

    try:
        if args.text:
            run_text(agent, emit)
        else:
            run_voice(agent, args, emit)
    except RuntimeError as exc:
        emit("error", str(exc))
        return 1
    finally:
        if close := getattr(agent.backend, "close", None):
            close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
