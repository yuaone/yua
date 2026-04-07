"""Matryoshka Representation Learning (MRL) embedding head for YUA 1.0.

Implements the Matryoshka embedding approach (Kusupati et al., 2022) where a single
model produces embeddings that are useful at multiple truncation dimensions.

True MRL design: single shared projection from d_model, then prefix-truncate to
each target dim. NO per-dim projection heads — the model learns to pack information
into earlier dimensions naturally.

During training:
    head = MatryoshkaHead(config)
    loss = head(hidden_states, labels, main_loss_fn)

During inference (zero-cost truncation):
    emb_256 = F.normalize(hidden_states[:, :256], p=2, dim=-1)
"""

from __future__ import annotations

from typing import Callable, Optional

import torch
import torch.nn as nn
import torch.nn.functional as F

from .config import YuaConfig

__all__ = ["MatryoshkaHead"]


class MatryoshkaHead(nn.Module):
    """Multi-granularity embedding head using true Matryoshka Representation Learning.

    Single shared linear projection from d_model → max(matryoshka_dims),
    then prefix-truncate to each target dim during training for multi-loss.

    Inference options:
      - encode(): uses learned projection (requires fine-tuning first)
      - encode_truncate(): zero-cost truncation of raw hidden states (no projection)

    Args:
        config: YuaConfig with matryoshka_dims and matryoshka_loss_weights set.
    """

    def __init__(self, config: YuaConfig) -> None:
        super().__init__()
        self.dims = sorted(config.matryoshka_dims)
        assert len(self.dims) > 0, "matryoshka_dims must be non-empty"

        self.max_dim = self.dims[-1]  # largest dim (sorted)

        # Single shared projection: d_model → max_dim
        # During training, output is truncated to each target dim for loss
        self.projection = nn.Linear(config.d_model, self.max_dim, bias=False)

        # Loss weights (uniform if not specified)
        if config.matryoshka_loss_weights is not None:
            # Re-sort weights to match sorted dims
            dim_to_weight = dict(zip(config.matryoshka_dims, config.matryoshka_loss_weights))
            weights = [dim_to_weight[d] for d in self.dims]
        else:
            weights = [1.0 / len(self.dims)] * len(self.dims)
        weights_t = torch.tensor(weights, dtype=torch.float32)
        weight_sum = weights_t.sum()
        if weight_sum <= 0:
            raise ValueError("Matryoshka loss weights must sum to > 0")
        self.register_buffer("loss_weights", weights_t / weight_sum)

        self._init_weights()

    def _init_weights(self) -> None:
        nn.init.normal_(self.projection.weight, mean=0.0, std=0.02)
        self.projection._yua_initialized = True

    def forward(
        self,
        hidden: torch.Tensor,
        labels: torch.Tensor,
        loss_fn: Callable[[torch.Tensor, torch.Tensor], torch.Tensor],
    ) -> torch.Tensor:
        """Compute weighted Matryoshka loss across all granularities.

        Args:
            hidden: (batch, seq_len, d_model) — final hidden states.
            labels: target tensor passed to loss_fn.
            loss_fn: callable(normalized_embedding, labels) -> scalar loss.

        Returns:
            Scalar loss (weighted sum across dimensions).
        """
        # Single shared projection: (B, S, d_model) → (B, S, max_dim)
        projected = self.projection(hidden)

        total_loss = torch.tensor(0.0, device=hidden.device, dtype=torch.float32)

        for i, d in enumerate(self.dims):
            # Prefix truncation — core MRL idea
            h_trunc = projected[..., :d]
            # L2 normalize for embedding quality
            h_norm = F.normalize(h_trunc, p=2, dim=-1)
            # Compute loss at this granularity
            dim_loss = loss_fn(h_norm, labels)
            total_loss = total_loss + self.loss_weights[i] * dim_loss

        return total_loss

    def encode(
        self, hidden: torch.Tensor, dim: int
    ) -> torch.Tensor:
        """Produce a normalized embedding at the specified dimension.

        Args:
            hidden: (..., d_model) — final hidden states.
            dim: target embedding dimension (must be in self.dims).

        Returns:
            L2-normalized embedding of shape (..., dim).
        """
        assert dim in self.dims, f"dim={dim} not in matryoshka_dims={self.dims}"
        projected = self.projection(hidden)
        h_trunc = projected[..., :dim]
        return F.normalize(h_trunc, p=2, dim=-1)

    @torch.no_grad()
    def encode_truncate(
        self, hidden: torch.Tensor, dim: int
    ) -> torch.Tensor:
        """Zero-cost truncation encoding (no projection, just normalize).

        For inference when you want the fastest path — just truncate hidden
        states directly and normalize. Slightly less accurate than encode()
        but requires no computation beyond normalization.

        Args:
            hidden: (..., d_model) — final hidden states.
            dim: target embedding dimension (<= d_model).

        Returns:
            L2-normalized truncated embedding of shape (..., dim).
        """
        h_trunc = hidden[..., :dim]
        return F.normalize(h_trunc, p=2, dim=-1)
