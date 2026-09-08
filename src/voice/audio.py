"""YUA Voice — 마이크 캡처 + 발화 구간 검출(VAD).

Silero VAD로 "말이 시작됐다 / 끝났다"를 판정한다.
Whisper를 계속 돌리지 않기 위해서다 — CPU에서는 이게 지연시간의 핵심이다.
"""

from __future__ import annotations

import queue
from collections.abc import Iterator
from dataclasses import dataclass

__all__ = ["Listener", "AudioConfig"]

SAMPLE_RATE = 16000
FRAME_MS = 32                       # Silero는 512 샘플(=32ms @16k) 단위를 기대한다
FRAME_SAMPLES = SAMPLE_RATE * FRAME_MS // 1000


@dataclass
class AudioConfig:
    speech_threshold: float = 0.5       # Silero 확률 임계값
    silence_ms: int = 700               # 이만큼 조용하면 발화 끝으로 본다
    min_speech_ms: int = 300            # 이보다 짧으면 잡음으로 버린다
    max_utterance_s: float = 30.0       # 안전장치
    pre_roll_ms: int = 300              # 발화 시작 직전 구간도 포함 (첫 음절 보존)
    device: int | None = None           # None = 시스템 기본 입력


class Listener:
    """마이크에서 발화 단위(numpy float32 배열)를 하나씩 내보낸다."""

    def __init__(self, config: AudioConfig | None = None) -> None:
        self.config = config or AudioConfig()
        try:
            import numpy as np
            import sounddevice as sd
            import torch
        except ImportError as exc:
            raise RuntimeError(
                "음성 입력에 필요한 패키지가 없습니다:\n"
                "  pip install sounddevice numpy torch\n"
                "  (Linux라면 sudo apt install portaudio19-dev 도 필요할 수 있습니다)"
            ) from exc

        self._np, self._sd, self._torch = np, sd, torch
        # Silero VAD는 1.8MB짜리 작은 모델이다 — 첫 실행 때만 받는다
        self._vad, _utils = torch.hub.load(
            repo_or_dir="snakers4/silero-vad", model="silero_vad", trust_repo=True,
        )
        self._queue: queue.Queue = queue.Queue()

    def _is_speech(self, frame) -> bool:
        tensor = self._torch.from_numpy(frame)
        with self._torch.no_grad():
            return float(self._vad(tensor, SAMPLE_RATE).item()) >= self.config.speech_threshold

    def listen(self) -> Iterator["object"]:
        """발화가 끝날 때마다 오디오 배열을 yield한다. Ctrl-C까지 계속 돈다."""
        np, cfg = self._np, self.config
        silence_frames = cfg.silence_ms // FRAME_MS
        min_frames = cfg.min_speech_ms // FRAME_MS
        pre_roll_frames = cfg.pre_roll_ms // FRAME_MS
        max_frames = int(cfg.max_utterance_s * 1000) // FRAME_MS

        def callback(indata, _frames, _time, status):     # sounddevice 콜백 스레드
            self._queue.put(indata[:, 0].copy())

        pre_roll: list = []
        collected: list = []
        quiet_run = 0
        speaking = False

        with self._sd.InputStream(
            samplerate=SAMPLE_RATE, channels=1, dtype="float32",
            blocksize=FRAME_SAMPLES, callback=callback, device=cfg.device,
        ):
            while True:
                frame = self._queue.get()
                voiced = self._is_speech(frame)

                if not speaking:
                    pre_roll.append(frame)
                    if len(pre_roll) > pre_roll_frames:
                        pre_roll.pop(0)
                    if voiced:
                        speaking = True
                        collected = [*pre_roll, frame]
                        pre_roll = []
                        quiet_run = 0
                    continue

                collected.append(frame)
                quiet_run = 0 if voiced else quiet_run + 1

                if quiet_run >= silence_frames or len(collected) >= max_frames:
                    speaking = False
                    utterance, collected = collected, []
                    if len(utterance) - quiet_run >= min_frames:
                        yield np.concatenate(utterance)
