"""Token embeddings for YUA 1.0. Positional encoding handled externally (RoPE or ALiBi)."""

from __future__ import annotations

import math
from typing import Optional

import torch
import torch.nn as nn
import torch.nn.functional as F

from .config import YuaConfig

__all__ = ["EmbeddingRMSNorm", "TokenEmbedding"]


class EmbeddingRMSNorm(nn.Module):
    """Root Mean Square Layer Normalization for embedding outputs."""

    def __init__(self, d_model: int, eps: float = 1e-6) -> None:
        super().__init__()
        self.weight = nn.Parameter(torch.ones(d_model))
        self.eps = eps

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x_fp32 = x.float()
        rms = torch.rsqrt(x_fp32.pow(2).mean(dim=-1, keepdim=True) + self.eps)
        return (x_fp32 * rms * self.weight.float()).to(x.dtype)


class TokenEmbedding(nn.Module):
    """Token embedding layer with optional weight-tied output projection.

    ALiBi provides positional information, so no positional embedding is needed.
    When ``tie_embeddings`` is True, the output projection shares weights with
    the input embedding table.

    Optional upgrades (all disabled by default for backward compat):
      - Factorized embedding (ALBERT): embed_dim < d_model with linear projection
      - Language embedding (mBART): additive language id embedding
      - Embedding RMSNorm: RMSNorm after projection
    """

    def __init__(self, config: YuaConfig) -> None:
        super().__init__()
        self.d_model = config.d_model
        self.vocab_size = config.vocab_size
        self.tie_embeddings = config.tie_embeddings
        self.embed_scaling = getattr(config, 'embed_scaling', True)

        effective_embed_dim = config.effective_embed_dim

        # Token embedding: vocab_size -> effective_embed_dim
        self.token_emb = nn.Embedding(config.vocab_size, effective_embed_dim)
        self.dropout = nn.Dropout(config.dropout) if config.dropout > 0 else nn.Identity()

        # Factorized embedding projection: embed_dim -> d_model (ALBERT-style)
        if effective_embed_dim != config.d_model:
            self.emb_proj = nn.Linear(effective_embed_dim, config.d_model, bias=False)
        else:
            self.emb_proj = None

        # Language embedding (mBART-style)
        if config.n_languages > 0:
            self.lang_emb = nn.Embedding(config.n_languages, config.d_model)
            self.language_embed_scale = config.language_embed_scale
        else:
            self.lang_emb = None
            self.language_embed_scale = 0.0

        # Embedding RMSNorm (applied after projection, before dropout)
        if config.embedding_rmsnorm:
            self.emb_norm = EmbeddingRMSNorm(config.d_model, eps=config.embedding_norm_eps)
        else:
            self.emb_norm = None

        if not config.tie_embeddings:
            self.output_proj = nn.Linear(config.d_model, config.vocab_size, bias=False)
        else:
            self.output_proj = None

        self._init_weights()

    def _init_weights(self) -> None:
        nn.init.normal_(self.token_emb.weight, mean=0.0, std=0.02)
        if self.output_proj is not None:
            nn.init.normal_(self.output_proj.weight, mean=0.0, std=0.02)
            self.output_proj._yua_initialized = True
        if self.emb_proj is not None:
            nn.init.normal_(self.emb_proj.weight, mean=0.0, std=0.02)
            self.emb_proj._yua_initialized = True
        if self.lang_emb is not None:
            nn.init.normal_(self.lang_emb.weight, mean=0.0, std=0.02)

    def forward(
        self,
        input_ids: torch.Tensor,
        language_ids: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """Embed token ids.

        Args:
            input_ids: (batch, seq_len) integer tensor.
            language_ids: (batch, seq_len) or (batch,) integer tensor.
                Optional language ids for multilingual embedding. Ignored if
                n_languages=0 in config.

        Returns:
            (batch, seq_len, d_model) float tensor.
        """
        # FSDP compute_dtype may cast input_ids to bf16 — force int for embedding lookup
        if input_ids.is_floating_point():
            input_ids = input_ids.long()
        x = self.token_emb(input_ids)

        # Factorized projection: embed_dim -> d_model
        if self.emb_proj is not None:
            x = self.emb_proj(x)

        if self.embed_scaling:
            x = x * math.sqrt(self.d_model)

        # Language embedding addition
        if self.lang_emb is not None and language_ids is not None:
            lang_x = self.lang_emb(language_ids)
            # Broadcast if language_ids is (batch,) -> (batch, 1, d_model)
            if lang_x.dim() == 2:
                lang_x = lang_x.unsqueeze(1)
            x = x + self.language_embed_scale * lang_x

        # Embedding RMSNorm
        if self.emb_norm is not None:
            x = self.emb_norm(x)

        return self.dropout(x)

    def project_to_vocab(self, hidden: torch.Tensor) -> torch.Tensor:
        """Project hidden states to vocabulary logits.

        Args:
            hidden: (batch, seq_len, d_model)

        Returns:
            (batch, seq_len, vocab_size)
        """
        if self.tie_embeddings:
            if self.emb_proj is not None:
                # Factorized tied case: d_model -> embed_dim -> vocab_size
                # hidden @ emb_proj.weight^T -> (B, S, embed_dim)
                # then @ token_emb.weight^T -> (B, S, vocab_size)
                hidden = F.linear(hidden, self.emb_proj.weight.t())
            return F.linear(hidden, self.token_emb.weight)
        return self.output_proj(hidden)
