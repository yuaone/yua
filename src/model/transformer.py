"""Single Transformer block for YUA 1.0 (Pre-LN pattern with RMSNorm)."""

from __future__ import annotations

from typing import Optional

import torch
import torch.nn as nn

from .attention import CausalSelfAttention
from .config import YuaConfig
from .moe import create_ffn

__all__ = ["RMSNorm", "TransformerBlock"]


class RMSNorm(nn.Module):
    """Root Mean Square Layer Normalization (Zhang & Sennrich, 2019)."""

    def __init__(self, d_model: int, eps: float = 1e-6) -> None:
        super().__init__()
        self.weight = nn.Parameter(torch.ones(d_model))
        self.eps = eps

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x_fp32 = x.float()
        rms = torch.rsqrt(x_fp32.pow(2).mean(dim=-1, keepdim=True) + self.eps)
        return (x_fp32 * rms * self.weight.float()).to(x.dtype)


class TransformerBlock(nn.Module):
    """Single Transformer decoder block.

    Pre-LN pattern::

        x -> RMSNorm -> Attention -> + residual -> RMSNorm -> FFN -> + residual
    """

    def __init__(self, config: YuaConfig, layer_idx: int = 0) -> None:
        super().__init__()
        self.layer_idx = layer_idx
        self.use_attn_res = config.attn_res == "block"

        if config.norm_type == "rmsnorm":
            self.norm1 = RMSNorm(config.d_model, eps=config.norm_eps)
            self.norm2 = RMSNorm(config.d_model, eps=config.norm_eps)
        else:
            self.norm1 = nn.LayerNorm(config.d_model, eps=config.norm_eps, bias=config.bias)
            self.norm2 = nn.LayerNorm(config.d_model, eps=config.norm_eps, bias=config.bias)

        self.attn = CausalSelfAttention(config, layer_idx=layer_idx)
        self.ffn = create_ffn(config)

        # Block AttnRes: learnable gates per layer (bounded via tanh)
        # Shape (1,) instead of scalar () for FSDP compatibility (shard_param_on_dim_0)
        if self.use_attn_res:
            self.attn_gate_raw = nn.Parameter(torch.zeros(1))
            self.ffn_gate_raw = nn.Parameter(torch.zeros(1))
            self._attn_alpha = config.attn_res_alpha
            self._ffn_alpha = config.ffn_res_alpha

    def forward(
        self,
        x: torch.Tensor,
        past_kv: Optional[tuple[torch.Tensor, torch.Tensor]] = None,
        position_offset: Optional[int] = None,
        use_cache: bool = False,
    ) -> tuple[torch.Tensor, Optional[tuple[torch.Tensor, torch.Tensor]], Optional[torch.Tensor]]:
        """Forward pass.

        Args:
            x: (batch, seq_len, d_model)
            past_kv: optional cached (key, value) for this layer's attention.
            position_offset: absolute position for RoPE (used when cache is truncated).
            use_cache: if True, return updated KV cache; otherwise new_kv is None.

        Returns:
            Tuple of (output, new_kv, ffn_aux_loss):
              - output: (batch, seq_len, d_model)
              - new_kv: updated KV cache, or None if use_cache is False.
              - ffn_aux_loss: MoE auxiliary loss scalar, or None for dense FFN.
        """
        attn_out, new_kv = self.attn(
            self.norm1(x), past_kv=past_kv, position_offset=position_offset,
            use_cache=use_cache,
        )

        ffn_aux_loss: Optional[torch.Tensor] = None

        if self.use_attn_res:
            attn_gate = 1.0 + self._attn_alpha * torch.tanh(self.attn_gate_raw)
            ffn_gate = 1.0 + self._ffn_alpha * torch.tanh(self.ffn_gate_raw)
            x = x + attn_gate * attn_out
            ffn_out = self.ffn(self.norm2(x))
            if isinstance(ffn_out, tuple):
                ffn_out, ffn_aux_loss = ffn_out
            x = x + ffn_gate * ffn_out
        else:
            x = x + attn_out
            ffn_out = self.ffn(self.norm2(x))
            if isinstance(ffn_out, tuple):
                ffn_out, ffn_aux_loss = ffn_out
            x = x + ffn_out

        return x, new_kv, ffn_aux_loss
