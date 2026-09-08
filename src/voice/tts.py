"""YUA Voice — 음성 합성 (TTS).

설치된 것 중 되는 걸 자동으로 고른다:
    Kokoro (82M, 품질 좋음) → pyttsx3 → macOS `say` → espeak-ng
전부 없으면 콘솔에 출력만 한다 — 루프가 죽지 않게.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from abc import ABC, abstractmethod

__all__ = ["Speaker", "load_speaker"]


class Speaker(ABC):
    name: str = "speaker"

    @abstractmethod
    def say(self, text: str) -> None:
        """텍스트를 소리로 낸다. 완료될 때까지 블록한다."""

    def close(self) -> None:
        return None


class KokoroSpeaker(Speaker):
    """Kokoro-82M — CPU에서 실시간, 품질이 가장 낫다."""

    name = "kokoro"

    def __init__(self, voice: str = "af_heart", lang_code: str = "a", speed: float = 1.0) -> None:
        from kokoro import KPipeline          # pip install kokoro soundfile sounddevice
        import sounddevice as sd

        self._pipeline = KPipeline(lang_code=lang_code)
        self._sd = sd
        self.voice = voice
        self.speed = speed

    def say(self, text: str) -> None:
        for _gs, _ps, audio in self._pipeline(text, voice=self.voice, speed=self.speed):
            self._sd.play(audio, samplerate=24000)
            self._sd.wait()


class Pyttsx3Speaker(Speaker):
    """OS 내장 TTS 래퍼. 오프라인, 품질은 보통."""

    name = "pyttsx3"

    def __init__(self, rate: int = 190) -> None:
        import pyttsx3

        self._engine = pyttsx3.init()
        self._engine.setProperty("rate", rate)

    def say(self, text: str) -> None:
        self._engine.say(text)
        self._engine.runAndWait()


class CommandSpeaker(Speaker):
    """외부 명령을 부르는 폴백 (macOS `say`, `espeak-ng`)."""

    def __init__(self, argv: list[str], name: str) -> None:
        self._argv = argv
        self.name = name

    def say(self, text: str) -> None:
        subprocess.run([*self._argv, text], check=False, capture_output=True)


class PrintSpeaker(Speaker):
    """TTS가 하나도 없을 때. 루프를 죽이지 않는 것이 목적."""

    name = "print"

    def say(self, text: str) -> None:
        print(f"🔊 {text}", file=sys.stderr)


def load_speaker(prefer: str = "auto", **kwargs) -> Speaker:
    """쓸 수 있는 TTS를 순서대로 시도한다."""
    candidates: list[tuple[str, callable]] = [
        ("kokoro", lambda: KokoroSpeaker(**kwargs)),
        ("pyttsx3", lambda: Pyttsx3Speaker()),
    ]
    if sys.platform == "darwin" and shutil.which("say"):
        candidates.append(("say", lambda: CommandSpeaker(["say"], "macos-say")))
    if shutil.which("espeak-ng"):
        candidates.append(("espeak", lambda: CommandSpeaker(["espeak-ng", "-v", "ko"], "espeak-ng")))

    if prefer != "auto":
        candidates = [c for c in candidates if c[0] == prefer] or candidates

    for label, factory in candidates:
        try:
            return factory()
        except Exception:      # 미설치/디바이스 없음 — 다음 후보로
            continue
    return PrintSpeaker()
