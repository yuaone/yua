"""Causal self-attention for YUA 1.0 with MHA/GQA, ALiBi/RoPE, optional FlashAttention."""

from __future__ import annotations

import inspect
import math
from typing import Optional

import torch
import torch.nn as nn
import torch.nn.functional as F

from .config import YuaConfig

__all__ = ["CausalSelfAttention"]

# ---------------------------------------------------------------------------
# Try importing FlashAttention v2
# ---------------------------------------------------------------------------
try:
    from flash_attn import flash_attn_func  # type: ignore

    FLASH_ATTN_AVAILABLE = True
except ImportError:
    FLASH_ATTN_AVAILABLE = False


# ---------------------------------------------------------------------------
# ALiBi helpers
# ---------------------------------------------------------------------------

def _get_alibi_slopes(n_heads: int) -> torch.Tensor:
    """Compute ALiBi slopes for *n_heads* heads.

    Uses the geometric sequence from the ALiBi paper (Press et al., 2022).
    For heads that are a power of 2 the slopes are exact; for others we
    interpolate the nearest power-of-2 set.
    """

    def _slopes_for_power_of_2(n: int) -> list[float]:
        start = 2 ** (-(2 ** -(math.log2(n) - 3)))
        return [start * (start ** i) for i in range(n)]

    if math.log2(n_heads).is_integer():
        slopes = _slopes_for_power_of_2(n_heads)
    else:
        # nearest power of 2 above and below
        closest_pow2 = 2 ** math.floor(math.log2(n_heads))
        slopes = (
            _slopes_for_power_of_2(closest_pow2)
            + _slopes_for_power_of_2(2 * closest_pow2)[0::2][: n_heads - closest_pow2]
        )
    return torch.tensor(slopes, dtype=torch.float32)


def build_alibi_bias(n_heads: int, seq_len: int, device: torch.device, dtype: torch.dtype) -> torch.Tensor:
    """Build ALiBi attention bias of shape ``(1, n_heads, seq_len, seq_len)``.

    The bias is lower-triangular (causal) with linearly increasing penalties
    for distant positions.
    """
    slopes = _get_alibi_slopes(n_heads).to(device=device, dtype=dtype)  # (n_heads,)
    # relative position matrix
    pos = torch.arange(seq_len, device=device, dtype=dtype)
    rel = pos.unsqueeze(0) - pos.unsqueeze(1)  # (seq_len, seq_len), col - row
    # causal: future positions get -inf, past positions get slope * distance
    alibi = slopes.unsqueeze(1).unsqueeze(2) * rel.unsqueeze(0)  # (n_heads, seq, seq)
    # mask future (strictly upper-triangular)
    causal_mask = torch.triu(torch.ones(seq_len, seq_len, device=device, dtype=torch.bool), diagonal=1)
    alibi.masked_fill_(causal_mask.unsqueeze(0), float("-inf"))
    return alibi.unsqueeze(0)  # (1, n_heads, seq, seq)


def _build_alibi_bias_for_cached(
    n_heads: int, q_len: int, kv_len: int,
    device: torch.device, dtype: torch.dtype,
) -> torch.Tensor:
    """Build ALiBi bias for cached attention: shape ``(1, n_heads, q_len, kv_len)``.

    When using KV cache, Q has only new tokens but K/V span the full sequence.
    The bias computes distance from each query position (at the end of the
    sequence) to each key position.
    """
    slopes = _get_alibi_slopes(n_heads).to(device=device, dtype=dtype)  # (n_heads,)
    # Query positions are at the end of the sequence: [kv_len - q_len, ..., kv_len - 1]
    q_pos = torch.arange(kv_len - q_len, kv_len, device=device, dtype=dtype)
    k_pos = torch.arange(kv_len, device=device, dtype=dtype)
    # rel[i, j] = k_pos[j] - q_pos[i]; negative means key is before query (allowed)
    rel = k_pos.unsqueeze(0) - q_pos.unsqueeze(1)  # (q_len, kv_len)
    alibi = slopes.unsqueeze(1).unsqueeze(2) * rel.unsqueeze(0)  # (n_heads, q_len, kv_len)
    # Mask future positions (where key is after query)
    causal_mask = rel > 0  # (q_len, kv_len)
    alibi.masked_fill_(causal_mask.unsqueeze(0), float("-inf"))
    return alibi.unsqueeze(0)  # (1, n_heads, q_len, kv_len)


# ---------------------------------------------------------------------------
# RoPE helpers
# ---------------------------------------------------------------------------

def _precompute_rope_freqs(head_dim: int, max_seq_len: int, theta: float = 10_000.0) -> torch.Tensor:
    """Precompute sin/cos rotary frequencies (XLA-compatible, no complex ops).

    Returns:
        Tensor of shape (max_seq_len, head_dim//2, 2) where [..., 0] = cos, [..., 1] = sin.
    """
    freqs = 1.0 / (theta ** (torch.arange(0, head_dim, 2, dtype=torch.float32) / head_dim))
    t = torch.arange(max_seq_len, dtype=torch.float32)
    angles = torch.outer(t, freqs)  # (seq, head_dim//2)
    return torch.stack([angles.cos(), angles.sin()], dim=-1)  # (seq, head_dim//2, 2)


def _apply_rope(x: torch.Tensor, freqs: torch.Tensor, offset: int = 0) -> torch.Tensor:
    """Apply RoPE to tensor x of shape (batch, n_heads, seq_len, head_dim).

    Uses real-number sin/cos rotation (XLA-compatible, no complex tensors).

    Args:
        x: input tensor (B, H, S, D).
        freqs: precomputed cos/sin frequencies (max_seq, D//2, 2).
        offset: position offset for KV cache (use past sequence length).
    """
    seq_len = x.shape[2]
    # freqs: (seq, D//2, 2) -> slice and broadcast to (1, 1, S, D//2)
    cos = freqs[offset : offset + seq_len, :, 0].unsqueeze(0).unsqueeze(0)  # (1, 1, S, D//2)
    sin = freqs[offset : offset + seq_len, :, 1].unsqueeze(0).unsqueeze(0)  # (1, 1, S, D//2)
    # Split into even/odd dimensions
    x_float = x.float()
    x_even = x_float[..., 0::2]  # (B, H, S, D//2)
    x_odd = x_float[..., 1::2]   # (B, H, S, D//2)
    # Apply rotation using real arithmetic
    x_rotated_even = x_even * cos - x_odd * sin
    x_rotated_odd = x_even * sin + x_odd * cos
    # Interleave back
    x_out = torch.stack([x_rotated_even, x_rotated_odd], dim=-1).flatten(-2)
    return x_out.to(x.dtype)


# ---------------------------------------------------------------------------
# Attention module
# ---------------------------------------------------------------------------

class CausalSelfAttention(nn.Module):
    """Multi-head / Grouped-query causal self-attention.

    Features:
      - Standard MHA when ``gqa_groups == 0``.
      - GQA when ``gqa_groups > 0``: Q has ``n_heads`` heads, K/V have
        ``gqa_groups`` heads, with broadcasting.
      - ALiBi positional bias (default).
      - RoPE positional encoding (alternative).
      - Optional FlashAttention (auto-detected at import time).
      - KV cache support for fast autoregressive generation.
    """

    def __init__(self, config: YuaConfig, layer_idx: int = 0) -> None:
        super().__init__()
        self.config = config
        self.layer_idx = layer_idx
        self.n_heads = config.n_heads
        self.n_kv_heads = config.n_kv_heads
        self.head_dim = config.head_dim
        self.d_model = config.d_model
        self.position_encoding = config.position_encoding
        # Resolve attention implementation from config
        self.attn_impl = getattr(config, "attn_impl", "auto")
        self.use_sdpa = hasattr(F, "scaled_dot_product_attention")
        if self.attn_impl == "auto":
            self.use_flash = FLASH_ATTN_AVAILABLE
        elif self.attn_impl == "flash":
            if not FLASH_ATTN_AVAILABLE:
                raise RuntimeError("attn_impl='flash' but flash_attn is not installed")
            self.use_flash = True
        elif self.attn_impl in ("sdpa", "naive"):
            self.use_flash = False
        else:
            raise ValueError(f"Unknown attn_impl: {self.attn_impl!r}")

        self.attn_logit_softcap = getattr(config, "attn_logit_softcap", None)

        # Validate GQA head divisibility
        if self.n_heads % self.n_kv_heads != 0:
            raise ValueError(
                f"n_heads ({self.n_heads}) must be divisible by "
                f"n_kv_heads ({self.n_kv_heads})"
            )

        # Validate head_dim is even for RoPE (complex-valued rotation)
        if self.position_encoding == "rope" and self.head_dim % 2 != 0:
            raise ValueError(
                f"head_dim ({self.head_dim}) must be even when using RoPE"
            )

        # Projections
        self.q_proj = nn.Linear(config.d_model, self.n_heads * self.head_dim, bias=config.bias)
        self.k_proj = nn.Linear(config.d_model, self.n_kv_heads * self.head_dim, bias=config.bias)
        self.v_proj = nn.Linear(config.d_model, self.n_kv_heads * self.head_dim, bias=config.bias)
        self.out_proj = nn.Linear(self.n_heads * self.head_dim, config.d_model, bias=config.bias)

        # QK-Norm: RMSNorm on Q/K per head (Qwen 3, Gemma 3, OLMo 2 표준)
        # 학습 안정성 향상, FP8/양자화 시 수치 안정성 확보
        self.use_qk_norm = getattr(config, "qk_norm", True)
        if self.use_qk_norm:
            from .transformer import RMSNorm
            self.q_norm = RMSNorm(self.head_dim, eps=config.qk_norm_eps)
            self.k_norm = RMSNorm(self.head_dim, eps=config.qk_norm_eps)

        self.attn_dropout = nn.Dropout(config.dropout) if config.dropout > 0 else nn.Identity()
        self.resid_dropout = nn.Dropout(config.dropout) if config.dropout > 0 else nn.Identity()

        # Position encoding caches (registered as buffers for device tracking)
        if self.position_encoding == "rope":
            rope_freqs = _precompute_rope_freqs(self.head_dim, config.context_length, config.rope_theta)
            self.register_buffer("_rope_freqs", rope_freqs, persistent=False)
        else:
            self._rope_freqs: Optional[torch.Tensor] = None

        # ALiBi bias cache (registered as buffer)
        if self.position_encoding == "alibi":
            alibi_bias = build_alibi_bias(self.n_heads, config.context_length, torch.device("cpu"), torch.float32)
            self.register_buffer("_alibi_cache", alibi_bias, persistent=False)
            self._alibi_cache_len = config.context_length
        else:
            self._alibi_cache: Optional[torch.Tensor] = None
            self._alibi_cache_len = 0

        self._init_weights(config)

    def _init_weights(self, config: YuaConfig) -> None:
        std = 0.02
        nn.init.normal_(self.q_proj.weight, mean=0.0, std=std)
        nn.init.normal_(self.k_proj.weight, mean=0.0, std=std)
        nn.init.normal_(self.v_proj.weight, mean=0.0, std=std)
        # Scaled init for residual path (GPT-2 style)
        nn.init.normal_(self.out_proj.weight, mean=0.0, std=std / math.sqrt(2 * config.n_layers))
        # Mark all as initialized to prevent _init_base_weights from overwriting
        for proj in (self.q_proj, self.k_proj, self.v_proj, self.out_proj):
            proj._yua_initialized = True

    # ----- helpers -----

    def _expand_kv(self, kv: torch.Tensor) -> torch.Tensor:
        """Repeat KV heads to match the number of Q heads for GQA."""
        if self.n_kv_heads == self.n_heads:
            return kv
        repeat = self.n_heads // self.n_kv_heads
        B, H_kv, S, D = kv.shape
        return kv.unsqueeze(2).expand(B, H_kv, repeat, S, D).reshape(B, self.n_heads, S, D)

    def _get_rope_freqs(self, seq_len: int, device: torch.device) -> torch.Tensor:
        if self._rope_freqs is None or self._rope_freqs.shape[0] < seq_len:
            new_freqs = _precompute_rope_freqs(
                self.head_dim, max(seq_len, self.config.context_length), self.config.rope_theta
            )
            self.register_buffer("_rope_freqs", new_freqs.to(device), persistent=False)
        return self._rope_freqs[:seq_len]

    # ----- forward -----

    def forward(
        self,
        x: torch.Tensor,
        past_kv: Optional[tuple[torch.Tensor, torch.Tensor]] = None,
        position_offset: Optional[int] = None,
        use_cache: bool = False,
    ) -> tuple[torch.Tensor, Optional[tuple[torch.Tensor, torch.Tensor]]]:
        """Forward pass.

        Args:
            x: (batch, seq_len, d_model)
            past_kv: optional cached (key, value) from previous steps.
                Each tensor has shape (B, n_kv_heads, past_seq_len, head_dim).
            position_offset: absolute position for RoPE when cache is truncated.
                If None, uses past_kv length (correct when no truncation).

        Returns:
            Tuple of (output, new_kv):
              - output: (batch, seq_len, d_model)
              - new_kv: (key, value) cache with full sequence, or None if
                past_kv was None (training mode).
        """
        B, S, _ = x.shape

        # QKV projections
        q = self.q_proj(x).view(B, S, self.n_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(x).view(B, S, self.n_kv_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(x).view(B, S, self.n_kv_heads, self.head_dim).transpose(1, 2)
        # q: (B, n_heads, S, head_dim), k/v: (B, n_kv_heads, S, head_dim)

        # QK-Norm: normalize Q/K per head before RoPE (Qwen 3, Gemma 3 방식)
        if self.use_qk_norm:
            q = self.q_norm(q)
            k = self.k_norm(k)

        # Determine position offset from cache
        # position_offset overrides past_len for RoPE when cache is truncated
        past_len = past_kv[0].shape[2] if past_kv is not None else 0
        rope_offset = position_offset if position_offset is not None else past_len

        # Apply position encoding
        if self.position_encoding == "rope":
            total_len = rope_offset + S
            freqs = self._get_rope_freqs(total_len, x.device)
            q = _apply_rope(q, freqs, offset=rope_offset)
            k = _apply_rope(k, freqs, offset=rope_offset)

        # Concatenate with past KV cache (before GQA expansion)
        if past_kv is not None:
            k = torch.cat([past_kv[0], k], dim=2)  # (B, n_kv_heads, past+S, D)
            v = torch.cat([past_kv[1], v], dim=2)
        new_kv: Optional[tuple[torch.Tensor, torch.Tensor]] = (k, v) if use_cache else None

        # Full KV sequence length after concatenation
        S_kv = k.shape[2]

        # Expand KV heads for GQA
        k_expanded = self._expand_kv(k)
        v_expanded = self._expand_kv(v)

        # Attention
        # SDPA eligible: no cache, no softcap, no ALiBi (they need manual attention)
        sdpa_eligible = (
            self.attn_impl in ("sdpa", "auto")
            and past_kv is None
            and self.attn_logit_softcap is None
            and self.position_encoding != "alibi"
        )
        # Flash eligible: CUDA, no cache, no softcap
        flash_eligible = (
            self.use_flash
            and x.is_cuda
            and past_kv is None
            and self.attn_logit_softcap is None
        )
        if self.attn_impl == "sdpa" and sdpa_eligible:
            # PyTorch SDPA path (training/prefill only, no cache)
            q_sdpa = q.contiguous()
            k_sdpa = k_expanded.contiguous()
            v_sdpa = v_expanded.contiguous()
            dropout_p = self.config.dropout if self.training else 0.0
            attn_out = F.scaled_dot_product_attention(
                q_sdpa, k_sdpa, v_sdpa, is_causal=True, dropout_p=dropout_p,
            )
            attn_out = attn_out.transpose(1, 2).reshape(B, S, self.n_heads * self.head_dim)
        elif flash_eligible:
            # FlashAttention: only used without cache (full sequence, training/prefill)
            # FlashAttention expects (B, S, H, D) and float16/bfloat16
            q_fa = q.transpose(1, 2)  # (B, S, H, D)
            k_fa = k_expanded.transpose(1, 2)
            v_fa = v_expanded.transpose(1, 2)

            # ALiBi support: pass alibi_slopes if FlashAttention supports it
            fa_kwargs: dict = {
                "causal": True,
                "dropout_p": self.config.dropout if self.training else 0.0,
            }
            if self.position_encoding == "alibi":
                _fa_params = inspect.signature(flash_attn_func).parameters
                if "alibi_slopes" in _fa_params:
                    fa_kwargs["alibi_slopes"] = _get_alibi_slopes(self.n_heads).to(
                        device=q.device, dtype=torch.float32
                    )
                else:
                    # FlashAttention doesn't support alibi_slopes; fall back to manual
                    attn_out = self._manual_attention(q, k_expanded, v_expanded, B, S, S_kv, rope_offset)
                    return self.resid_dropout(self.out_proj(attn_out)), new_kv

            attn_out = flash_attn_func(q_fa, k_fa, v_fa, **fa_kwargs)
            attn_out = attn_out.reshape(B, S, self.n_heads * self.head_dim)
        elif sdpa_eligible and self.use_sdpa:
            # Auto fallback to SDPA when flash is unavailable but SDPA is
            q_sdpa = q.contiguous()
            k_sdpa = k_expanded.contiguous()
            v_sdpa = v_expanded.contiguous()
            dropout_p = self.config.dropout if self.training else 0.0
            attn_out = F.scaled_dot_product_attention(
                q_sdpa, k_sdpa, v_sdpa, is_causal=True, dropout_p=dropout_p,
            )
            attn_out = attn_out.transpose(1, 2).reshape(B, S, self.n_heads * self.head_dim)
        else:
            attn_out = self._manual_attention(q, k_expanded, v_expanded, B, S, S_kv, rope_offset)

        return self.resid_dropout(self.out_proj(attn_out)), new_kv

    def _manual_attention(
        self,
        q: torch.Tensor,
        k: torch.Tensor,
        v: torch.Tensor,
        B: int,
        S_q: int,
        S_kv: int,
        rope_offset: int = 0,
    ) -> torch.Tensor:
        """Standard scaled dot-product attention with causal mask and optional ALiBi.

        When using KV cache, q has shape (B, H, S_q, D) but k/v have
        shape (B, H, S_kv, D) where S_kv includes past cache length.
        """
        scale = 1.0 / math.sqrt(self.head_dim)
        scores = torch.matmul(q, k.transpose(-2, -1)) * scale  # (B, H, S_q, S_kv)

        # Attention logit soft-capping (Gemma 2 style)
        if self.attn_logit_softcap is not None:
            cap = self.attn_logit_softcap
            scores = cap * torch.tanh(scores / cap)

        past_len = S_kv - S_q  # derive from shapes

        if self.position_encoding == "alibi":
            if rope_offset == 0:
                # No cache: use the standard square ALiBi bias
                if self._alibi_cache is not None and S_kv <= self._alibi_cache_len:
                    alibi = self._alibi_cache[:, :, :S_kv, :S_kv].to(dtype=q.dtype)
                else:
                    alibi = build_alibi_bias(self.n_heads, S_kv, device=q.device, dtype=q.dtype)
                    self.register_buffer("_alibi_cache", alibi, persistent=False)
                    self._alibi_cache_len = S_kv
            else:
                # Cached: build rectangular ALiBi bias (q_len x kv_len)
                alibi = _build_alibi_bias_for_cached(
                    self.n_heads, S_q, S_kv, device=q.device, dtype=q.dtype,
                )
            scores = scores + alibi
        else:
            # Apply causal mask for RoPE
            # Use rope_offset for absolute position (handles cache truncation)
            if past_len == 0 and rope_offset == 0:
                # Standard square causal mask (training, no cache)
                causal = torch.triu(torch.ones(S_q, S_kv, device=q.device, dtype=torch.bool), diagonal=1)
            else:
                # With cache: new tokens can attend to all past + themselves causally
                # q positions use absolute offset for correct masking after truncation
                q_pos = torch.arange(rope_offset, rope_offset + S_q, device=q.device)
                # k positions: cache spans [rope_offset - past_len, ..., rope_offset + S_q - 1]
                k_start = rope_offset - past_len
                k_pos = torch.arange(k_start, k_start + S_kv, device=q.device)
                causal = k_pos.unsqueeze(0) > q_pos.unsqueeze(1)  # (S_q, S_kv)
            scores.masked_fill_(causal.unsqueeze(0).unsqueeze(0), float("-inf"))

        attn_weights = F.softmax(scores.float(), dim=-1).to(v.dtype)
        attn_weights = torch.nan_to_num(attn_weights, nan=0.0)
        attn_weights = self.attn_dropout(attn_weights)
        out = torch.matmul(attn_weights, v)  # (B, H, S_q, D)
        return out.transpose(1, 2).reshape(B, S_q, self.n_heads * self.head_dim)
