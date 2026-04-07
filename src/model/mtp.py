"""Multi-Token Prediction (MTP) auxiliary heads for YUA 1.0.

Reference: Meta, "Better & Faster LLMs via Multi-token Prediction" (2024).

Each MTP head predicts the token at position t+k (k=2,3,...) given the hidden
state at position t.  Heads share the main model's embedding projection weight
(weight tying) so they add minimal parameters — just a small transform MLP per
head.

During training the MTP loss is averaged across heads and added to the standard
CLM loss with a configurable weight.  During inference MTP heads are unused.
"""

from __future__ import annotations

import weakref
from typing import Optional

import torch
import torch.nn as nn
import torch.nn.functional as F

from src.token_protocol import IGNORE_INDEX


__all__ = ["MTPHead", "MTPLoss"]


class MTPHead(nn.Module):
    """Single auxiliary head that predicts the token at offset *k* from the
    current position.

    Architecture::

        hidden  ->  Linear(d, d)  ->  GELU  ->  Linear(d, d)  ->  proj_to_vocab

    The final vocab projection can optionally share weights with the main
    embedding table (``shared_proj_weight``).
    """

    def __init__(
        self,
        d_model: int,
        vocab_size: int,
        shared_proj_owner: Optional[nn.Embedding] = None,
    ) -> None:
        super().__init__()
        self.d_model = d_model
        self.vocab_size = vocab_size

        # Small transform MLP (the only trainable params per head)
        self.transform = nn.Sequential(
            nn.Linear(d_model, d_model, bias=False),
            nn.GELU(),
            nn.Linear(d_model, d_model, bias=False),
        )

        # Vocab projection — tied or independent
        # WARNING: When weight tying is enabled, MTP must read the embedding
        # weight from the live embedding module. Caching a raw Tensor/Parameter
        # reference is fragile across load_state_dict()/to(device) on XLA.
        if shared_proj_owner is not None:
            self._shared_proj_owner_ref: Optional[weakref.ReferenceType[nn.Embedding]] = weakref.ref(shared_proj_owner)
            self.output_proj = None
        else:
            self._shared_proj_owner_ref = None
            self.output_proj = nn.Linear(d_model, vocab_size, bias=False)

        self._init_weights()

    def _init_weights(self) -> None:
        for m in self.transform:
            if isinstance(m, nn.Linear):
                nn.init.normal_(m.weight, mean=0.0, std=0.02)
                m._yua_initialized = True  # type: ignore[attr-defined]
        if self.output_proj is not None:
            nn.init.normal_(self.output_proj.weight, mean=0.0, std=0.02)
            self.output_proj._yua_initialized = True  # type: ignore[attr-defined]

    def project_to_vocab(self, hidden: torch.Tensor) -> torch.Tensor:
        """Project hidden states to vocab logits."""
        if self._shared_proj_owner_ref is not None:
            owner = self._shared_proj_owner_ref()
            if owner is None:
                raise RuntimeError("MTP shared projection owner is no longer available")
            w = owner.weight
            assert w.device == hidden.device, (
                f"MTP shared weight device mismatch: weight={w.device}, hidden={hidden.device}. "
                f"Call model.to(device) or model.post_load_init() first."
            )
            return F.linear(hidden, w)
        assert self.output_proj is not None
        return self.output_proj(hidden)

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        """Transform hidden states and project to vocabulary.

        Args:
            hidden_states: (B, S, D)

        Returns:
            logits: (B, S, V)
        """
        h = self.transform(hidden_states)  # (B, S, D)
        return self.project_to_vocab(h)


class MTPLoss(nn.Module):
    """Compute combined CLM + MTP auxiliary loss.

    Main loss:  standard next-token prediction (predict t+1 from position t).
    MTP losses: predict token at t+k (k=2,3,...,num_heads+1) from position t.

    The MTP losses are averaged across heads and added with weight
    ``mtp_weight`` to the main loss::

        total = main_loss + mtp_weight * mean(mtp_head_losses)

    Uses chunked cross-entropy to prevent OOM with large vocabularies,
    matching the main model's approach.
    """

    def __init__(self, mtp_weight: float = 0.1, chunk_size: int = 2048) -> None:
        super().__init__()
        self.mtp_weight = mtp_weight
        self.chunk_size = chunk_size
        self.last_loss_components: dict[str, object] = {}

    @staticmethod
    def _chunked_cross_entropy(
        hidden_flat: torch.Tensor,
        targets_flat: torch.Tensor,
        proj_fn,
        chunk_size: int,
    ) -> torch.Tensor:
        """Compute cross-entropy loss in chunks to save VRAM.

        Args:
            hidden_flat: (N, D) — flattened hidden states.
            targets_flat: (N,) — target token ids.
            proj_fn: callable that maps (chunk, D) -> (chunk, V).
            chunk_size: number of tokens per chunk.

        Returns:
            Scalar mean loss (ignoring padding with id=-1).
        """
        N = hidden_flat.shape[0]
        total_loss = torch.tensor(0.0, device=hidden_flat.device, dtype=torch.float32)
        total_tokens = torch.tensor(0, device=hidden_flat.device, dtype=torch.long)

        for i in range(0, N, chunk_size):
            end = min(i + chunk_size, N)
            logits = proj_fn(hidden_flat[i:end])  # (chunk, V)
            t = targets_flat[i:end]
            loss = F.cross_entropy(logits, t, ignore_index=IGNORE_INDEX, reduction="sum")
            total_loss = total_loss + loss
            total_tokens = total_tokens + (t != IGNORE_INDEX).sum()

        return total_loss / total_tokens.clamp(min=1)

    def forward(
        self,
        hidden_states: torch.Tensor,
        targets: torch.Tensor,
        main_proj_fn,
        mtp_heads: nn.ModuleList,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """Compute combined CLM + MTP loss.

        Args:
            hidden_states: (B, S, D) — output of final norm.
            targets: (B, S) — target token ids (model shifts internally).
            main_proj_fn: callable for main vocab projection (embedding.project_to_vocab).
            mtp_heads: nn.ModuleList of MTPHead instances.

        Returns:
            (total_loss, main_loss) — total includes MTP, main_loss is for logging.
        """
        B, S, D = hidden_states.shape

        # --- Main CLM loss: predict t+1 from position t ---
        shift_h = hidden_states[:, :-1, :].contiguous()  # (B, S-1, D)
        shift_t = targets[:, 1:].contiguous().view(-1)    # (B*(S-1),)
        shift_h_flat = shift_h.view(-1, D)                # (B*(S-1), D)

        main_loss = self._chunked_cross_entropy(
            shift_h_flat, shift_t, main_proj_fn, self.chunk_size,
        )

        if len(mtp_heads) == 0 or self.mtp_weight == 0.0:
            self.last_loss_components = {
                "total_loss": float(main_loss.detach().item()),
                "main_loss": float(main_loss.detach().item()),
                "avg_mtp_loss": 0.0,
                "head_losses": [],
            }
            return main_loss, main_loss

        # --- MTP auxiliary losses ---
        mtp_losses: list[torch.Tensor] = []

        for k_idx, head in enumerate(mtp_heads):
            # Head k_idx predicts token at t + (k_idx + 2)
            offset = k_idx + 2  # first MTP head predicts t+2

            if offset >= S:
                # Sequence too short for this head — skip
                continue

            # Hidden states: positions 0..S-offset-1 predict token at offset..S-1
            h = hidden_states[:, : S - offset, :].contiguous()  # (B, S-offset, D)
            t = targets[:, offset:].contiguous().view(-1)        # (B*(S-offset),)

            # Transform through the MTP head's MLP
            h_transformed = head.transform(h)  # (B, S-offset, D)
            h_flat = h_transformed.view(-1, D)  # (B*(S-offset), D)

            loss_k = self._chunked_cross_entropy(
                h_flat, t, head.project_to_vocab, self.chunk_size,
            )
            mtp_losses.append(loss_k)

        if mtp_losses:
            avg_mtp_loss = torch.stack(mtp_losses).mean()
            total_loss = main_loss + self.mtp_weight * avg_mtp_loss
        else:
            total_loss = main_loss

        self.last_loss_components = {
            "total_loss": float(total_loss.detach().item()),
            "main_loss": float(main_loss.detach().item()),
            "avg_mtp_loss": float(avg_mtp_loss.detach().item()) if mtp_losses else 0.0,
            "head_losses": [float(loss.detach().item()) for loss in mtp_losses],
        }

        return total_loss, main_loss
