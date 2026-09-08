"""YUA Voice — 음성 인식 (STT).

faster-whisper를 쓴다. CPU int8로도 실시간에 가깝게 돈다.
GPU가 있으면 device="cuda"로 바꾸기만 하면 된다.
"""

from __future__ import annotations

from dataclasses import dataclass

__all__ = ["Transcriber", "STTConfig"]


@dataclass
class STTConfig:
    # tiny(39M) < base(74M) < small(244M) < medium(769M) < large-v3-turbo(809M)
    # 한국어는 small 이상을 권장. CPU라면 small이 속도/정확도 균형점.
    model_size: str = "small"
    device: str = "cpu"              # "cpu" | "cuda" | "auto"
    compute_type: str = "int8"       # CPU면 int8, GPU면 float16
    language: str | None = "ko"      # None이면 자동 감지
    beam_size: int = 1               # 1 = greedy, 가장 빠름
    vad_filter: bool = True


class Transcriber:
    """오디오 배열 → 텍스트."""

    def __init__(self, config: STTConfig | None = None) -> None:
        self.config = config or STTConfig()
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise RuntimeError(
                "faster-whisper가 필요합니다:  pip install faster-whisper\n"
                "  (처음 실행 시 모델을 자동으로 내려받습니다)"
            ) from exc

        self._model = WhisperModel(
            self.config.model_size,
            device=self.config.device,
            compute_type=self.config.compute_type,
        )

    def transcribe(self, audio, sample_rate: int = 16000) -> str:
        """16kHz mono float32 numpy 배열을 텍스트로 바꾼다."""
        if sample_rate != 16000:
            raise ValueError(f"16kHz 오디오가 필요합니다 (받은 값: {sample_rate})")

        segments, _info = self._model.transcribe(
            audio,
            language=self.config.language,
            beam_size=self.config.beam_size,
            vad_filter=self.config.vad_filter,
            condition_on_previous_text=False,   # 환각 누적 방지
        )
        return " ".join(seg.text.strip() for seg in segments).strip()
