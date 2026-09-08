"""YUA Voice — 음성 입출력 계층."""

from __future__ import annotations

__all__ = ["Transcriber", "STTConfig", "load_speaker", "Speaker", "Listener", "AudioConfig", "VoiceLoop"]


def __getattr__(name: str):
    """무거운 의존성(torch, sounddevice)을 실제로 쓸 때만 import한다."""
    if name in ("Transcriber", "STTConfig"):
        from . import stt
        return getattr(stt, name)
    if name in ("load_speaker", "Speaker"):
        from . import tts
        return getattr(tts, name)
    if name in ("Listener", "AudioConfig"):
        from . import audio
        return getattr(audio, name)
    if name == "VoiceLoop":
        from .loop import VoiceLoop
        return VoiceLoop
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
