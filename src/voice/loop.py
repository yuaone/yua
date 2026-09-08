"""YUA Voice — 음성 왕복 루프.

    마이크 → VAD → Whisper → Agent(+도구) → TTS → 스피커

Agent가 문장을 완성할 때마다 바로 말하기 시작한다.
전체 답변을 기다리지 않기 때문에 체감 지연이 크게 줄어든다.
"""

from __future__ import annotations

import queue
import threading
from collections.abc import Callable

from ..runtime.agent import Agent

__all__ = ["VoiceLoop"]


class VoiceLoop:
    """STT · Agent · TTS를 묶는다. TTS는 별도 스레드에서 소비한다."""

    def __init__(
        self,
        agent: Agent,
        transcriber,
        speaker,
        listener,
        on_event: Callable[[str, str], None] | None = None,
    ) -> None:
        self.agent = agent
        self.transcriber = transcriber
        self.speaker = speaker
        self.listener = listener
        self.on_event = on_event or (lambda kind, text: None)

        self._speech_queue: queue.Queue[str | None] = queue.Queue()
        self._tts_thread: threading.Thread | None = None

    # -- TTS 소비자 -------------------------------------------------------
    def _tts_worker(self) -> None:
        while (text := self._speech_queue.get()) is not None:
            try:
                self.speaker.say(text)
            except Exception as exc:            # 오디오 오류가 대화를 끊지 않게
                self.on_event("error", f"TTS 실패: {exc}")

    def _start_tts(self) -> None:
        if self._tts_thread is None:
            self._tts_thread = threading.Thread(target=self._tts_worker, daemon=True)
            self._tts_thread.start()

    def _stop_tts(self) -> None:
        if self._tts_thread is not None:
            self._speech_queue.put(None)
            self._tts_thread.join(timeout=5.0)
            self._tts_thread = None

    # -- 한 턴 -----------------------------------------------------------
    def handle_text(self, text: str) -> str:
        """텍스트 한 줄을 처리한다 (키보드 입력에서도 재사용)."""
        self.on_event("user", text)
        answer = self.agent.chat(
            text,
            on_sentence=self._speech_queue.put,
            on_tool=lambda name, args: self.on_event("tool", f"{name}({args})"),
        )
        self.on_event("assistant", answer)
        return answer

    # -- 메인 루프 --------------------------------------------------------
    def run(self) -> None:
        self._start_tts()
        self.on_event("system", "듣고 있습니다. (Ctrl-C로 종료)")
        try:
            for audio in self.listener.listen():
                text = self.transcriber.transcribe(audio)
                if not text or len(text) < 2:
                    continue                    # 잡음/기침은 버린다
                self.handle_text(text)
        except KeyboardInterrupt:
            self.on_event("system", "종료합니다.")
        finally:
            self._stop_tts()
