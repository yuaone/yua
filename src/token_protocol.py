"""YUA 1.0 — Token Protocol SSOT (Single Source of Truth).

모든 special token ID를 한 곳에서 정의한다.
다른 파일은 반드시 이 모듈에서 import해서 사용해야 한다.

절대 금지:
- 128000, 128001 등의 하드코딩
- vocab_size 기반 동적 계산 (register_special_tokens 방식)

Usage:
    from src.token_protocol import get_token_protocol, TokenProtocol
    tp = get_token_protocol(base_vocab_size=128000)
"""

from __future__ import annotations

from dataclasses import dataclass

__all__ = [
    "TokenProtocol", "get_token_protocol", "IGNORE_INDEX",
    "IM_START", "IM_END",
]

# PyTorch cross_entropy ignore_index
IGNORE_INDEX = -100

# ChatML 문자열 상수 (순환 import 방지를 위해 여기에 정의)
IM_START = "<|im_start|>"
IM_END = "<|im_end|>"


@dataclass(frozen=True)
class TokenProtocol:
    """All special token IDs in one place.

    128K BPE tokenizer (yua_128k_v2):
        0: unk, 1: bos, 2: eos, 3: pad
        4: <|im_start|>, 5: <|im_end|>
        6: <|fim_prefix|>, 7: <|fim_middle|>, 8: <|fim_suffix|>

    Special tokens are baked into the tokenizer via user_defined_symbols.
    model_vocab_size = base_vocab_size (128000, 추가 슬롯 불필요)
    """

    base_vocab_size: int

    # SentencePiece 기본 토큰
    unk_id: int = 0
    bos_id: int = 1
    eos_id: int = 2
    pad_id: int = 3

    # ChatML — tokenizer에 bake-in된 고정 ID
    im_start_id: int = 4
    im_end_id: int = 5

    # Fill-in-Middle (FIM) — tokenizer에 bake-in된 고정 ID
    fim_pre_id: int = 6
    fim_mid_id: int = 7
    fim_suf_id: int = 8

    # 모델 embedding = tokenizer vocab 그대로 (추가 슬롯 없음)
    @property
    def model_vocab_size(self) -> int:
        return self.base_vocab_size

    # ChatML special token dict (기존 호환)
    @property
    def special_token_ids(self) -> dict[str, int]:
        return {
            "im_start": self.im_start_id,
            "im_end": self.im_end_id,
        }

    def validate(self) -> None:
        """ID 충돌 없는지 검증."""
        ids = [
            self.unk_id, self.bos_id, self.eos_id, self.pad_id,
            self.im_start_id, self.im_end_id,
            self.fim_pre_id, self.fim_suf_id, self.fim_mid_id,
        ]
        assert len(ids) == len(set(ids)), f"Token ID collision detected: {ids}"


def get_token_protocol(base_vocab_size: int = 128000) -> TokenProtocol:
    """표준 TokenProtocol 인스턴스 반환.

    Args:
        base_vocab_size: default 128000, override via config.
    """
    tp = TokenProtocol(base_vocab_size=base_vocab_size)
    tp.validate()
    return tp
