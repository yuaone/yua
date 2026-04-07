"""Feed-forward network for YUA 1.0 Transformer blocks."""

from __future__ import annotations

import math

import torch
import torch.nn as nn
import torch.nn.functional as F

from .config import YuaConfig

__all__ = ["FeedForward"]


class FeedForward(nn.Module):
    """Position-wise feed-forward network.

    Supports two modes:
      - **GELU** (default): ``Linear(d_model, ffn_dim) -> GELU -> Linear(ffn_dim, d_model)``
      - **SwiGLU**: ``gate = Linear(d_model, ffn_dim); up = Linear(d_model, ffn_dim);
        out = Linear(ffn_dim, d_model); return out(SiLU(gate(x)) * up(x))``
    """

    def __init__(self, config: YuaConfig) -> None:
        super().__init__()
        self.activation = config.activation

        if self.activation not in {"gelu", "swiglu"}:
            raise ValueError(
                f"Unsupported activation '{self.activation}'. "
                f"Must be one of: 'gelu', 'swiglu'"
            )

        self.swiglu_limit = config.swiglu_limit

        if config.activation == "swiglu":
            self.gate_proj = nn.Linear(config.d_model, config.ffn_dim, bias=config.bias)
            self.up_proj = nn.Linear(config.d_model, config.ffn_dim, bias=config.bias)
            self.down_proj = nn.Linear(config.ffn_dim, config.d_model, bias=config.bias)
        else:
            # Standard GELU FFN
            self.up_proj = nn.Linear(config.d_model, config.ffn_dim, bias=config.bias)
            self.down_proj = nn.Linear(config.ffn_dim, config.d_model, bias=config.bias)

        self.dropout = nn.Dropout(config.dropout) if config.dropout > 0 else nn.Identity()
        self._init_weights(config)

    def _init_weights(self, config: YuaConfig) -> None:
        std = 0.02
        nn.init.normal_(self.up_proj.weight, mean=0.0, std=std)
        # Scaled init for residual path
        nn.init.normal_(self.down_proj.weight, mean=0.0, std=std / math.sqrt(2 * config.n_layers))
        if self.activation == "swiglu":
            nn.init.normal_(self.gate_proj.weight, mean=0.0, std=std)
            self.gate_proj._yua_initialized = True
        # Bias init: zero
        for proj in [self.up_proj, self.down_proj] + (
            [self.gate_proj] if self.activation == "swiglu" else []
        ):
            if proj.bias is not None:
                nn.init.zeros_(proj.bias)
        # Mark as initialized to prevent _init_base_weights from overwriting
        self.up_proj._yua_initialized = True
        self.down_proj._yua_initialized = True

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass.

        Args:
            x: (batch, seq_len, d_model)

        Returns:
            (batch, seq_len, d_model)
        """
        if self.activation == "swiglu":
            # SwiGLU with activation clamping (GPT-OSS 방식, swiglu_limit=7.0)
            # 학습 안정성: activation 폭발 방지, bf16/fp16 overflow 방지
            gate = F.silu(self.gate_proj(x))
            gate = gate.clamp(max=self.swiglu_limit)  # upper clamp만 유의미 (SiLU 하한은 ~-0.28)
            return self.dropout(self.down_proj(gate * self.up_proj(x)))
        else:
            return self.dropout(self.down_proj(F.gelu(self.up_proj(x))))
