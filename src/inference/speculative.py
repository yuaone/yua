"""Speculative decoding for YUA 1.0 — lossless acceleration."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

import torch
import torch.nn.functional as F

from src.model.yua_model import YuaModel

logger = logging.getLogger(__name__)


@dataclass
class SpeculativeStats:
    """Track acceptance rates for monitoring."""
    total_draft: int = 0
    accepted: int = 0
    rounds: int = 0

    @property
    def acceptance_rate(self) -> float:
        return self.accepted / max(self.total_draft, 1)

    @property
    def avg_accepted_per_round(self) -> float:
        return self.accepted / max(self.rounds, 1)

    def reset(self) -> None:
        self.total_draft = 0
        self.accepted = 0
        self.rounds = 0


class SpeculativeDecoder:
    """Speculative decoding: draft model proposes, target model verifies.

    Output distribution is identical to target model (lossless).

    Args:
        target_model: The large model (verifier).
        draft_model: The small model (proposer). Must share tokenizer.
        k: Number of draft tokens per round.
        temperature: Sampling temperature.
    """

    def __init__(
        self,
        target_model: YuaModel,
        draft_model: YuaModel,
        k: int = 5,
        temperature: float = 1.0,
    ) -> None:
        self.target = target_model
        self.draft = draft_model
        self.k = k
        self.temperature = temperature
        self.stats = SpeculativeStats()
        self.device = next(target_model.parameters()).device

    @torch.no_grad()
    def generate(
        self,
        input_ids: torch.Tensor,
        max_new_tokens: int = 128,
        eos_token_id: Optional[int] = None,
    ) -> torch.Tensor:
        """Generate tokens using speculative decoding.

        Args:
            input_ids: (1, seq_len) prompt token ids.
            max_new_tokens: Maximum tokens to generate.
            eos_token_id: Stop on this token.

        Returns:
            (1, seq_len + generated) token ids.
        """
        self.target.eval()
        self.draft.eval()

        generated = input_ids.to(self.device)
        tokens_generated = 0

        while tokens_generated < max_new_tokens:
            remaining = max_new_tokens - tokens_generated
            k = min(self.k, remaining)

            # 1. Draft model: generate k candidate tokens
            draft_tokens, draft_probs = self._draft_k(generated, k)

            # 2. Target model: compute probs for all k+1 positions in one pass
            target_probs = self._target_verify(generated, draft_tokens)

            # 3. Accept/reject
            n_accepted, bonus_token = self._accept_reject(
                draft_tokens, draft_probs, target_probs, k
            )

            # 4. Append accepted tokens + bonus
            accepted = draft_tokens[:, :n_accepted]
            generated = torch.cat([generated, accepted, bonus_token], dim=1)
            tokens_generated += n_accepted + 1

            self.stats.total_draft += k
            self.stats.accepted += n_accepted
            self.stats.rounds += 1

            # EOS check
            if eos_token_id is not None:
                if (generated[0, -1] == eos_token_id).item():
                    break

        return generated

    def _draft_k(
        self, prefix: torch.Tensor, k: int
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """Generate k tokens from draft model, return tokens and full vocab probs."""
        draft_tokens = []
        draft_probs = []  # full vocab probs for each step
        ctx = prefix

        for _ in range(k):
            logits, _, _ = self.draft(ctx[:, -self.draft.config.context_length:])
            logits = logits[:, -1, :]

            probs = self._get_probs(logits)
            token = torch.multinomial(probs, num_samples=1)

            draft_tokens.append(token)
            draft_probs.append(probs)  # (1, vocab) — full distribution 저장
            ctx = torch.cat([ctx, token], dim=1)

        return (
            torch.cat(draft_tokens, dim=1),         # (1, k)
            torch.stack(draft_probs, dim=1),         # (1, k, vocab)
        )

    def _target_verify(
        self, prefix: torch.Tensor, draft_tokens: torch.Tensor
    ) -> torch.Tensor:
        """Run target model on prefix + draft tokens, return probs at each position."""
        full_seq = torch.cat([prefix, draft_tokens], dim=1)
        ctx = full_seq[:, -self.target.config.context_length:]
        logits, _, _ = self.target(ctx)

        # We need probs at positions corresponding to each draft token + 1 bonus
        # prefix has length P, draft has length k
        # logits shape: (1, ctx_len, vocab)
        P = prefix.shape[1]
        k = draft_tokens.shape[1]
        start = max(0, ctx.shape[1] - k - 1)
        relevant_logits = logits[:, start:start + k + 1, :]  # (1, k+1, vocab)

        probs = self._get_probs(relevant_logits)
        return probs  # (1, k+1, vocab)

    def _accept_reject(
        self,
        draft_tokens: torch.Tensor,
        draft_probs: torch.Tensor,   # (1, k, vocab)
        target_probs: torch.Tensor,  # (1, k+1, vocab)
        k: int,
    ) -> tuple[int, torch.Tensor]:
        """Accept/reject draft tokens (Leviathan et al. 2023).

        Returns (n_accepted, bonus_token).
        """
        n_accepted = 0

        for i in range(k):
            token = draft_tokens[0, i].item()
            q_x = draft_probs[0, i, token].item()   # q(x) — draft prob for chosen token
            p_x = target_probs[0, i, token].item()   # p(x) — target prob for chosen token

            # Accept with probability min(1, p(x) / q(x))
            if q_x <= 0:
                break

            accept_prob = min(1.0, p_x / q_x)
            if torch.rand(1).item() < accept_prob:
                n_accepted += 1
            else:
                # Reject: sample from adjusted distribution
                # p'(x) = max(0, p_target(x) - p_draft(x)), then normalize
                adjusted = torch.clamp(
                    target_probs[0, i] - draft_probs[0, i], min=0
                )
                adj_sum = adjusted.sum()
                if adj_sum > 0:
                    adjusted = adjusted / adj_sum
                    bonus = torch.multinomial(adjusted.unsqueeze(0), num_samples=1)
                else:
                    # Edge case: adjusted가 전부 0이면 target에서 직접 샘플링
                    bonus = torch.multinomial(target_probs[0, i].unsqueeze(0), num_samples=1)
                return n_accepted, bonus

        # All accepted: bonus token from target's k+1 position
        bonus = torch.multinomial(target_probs[0, k].unsqueeze(0), num_samples=1)
        return n_accepted, bonus

    def _get_probs(self, logits: torch.Tensor) -> torch.Tensor:
        if self.temperature <= 0:
            # Greedy: one-hot
            probs = torch.zeros_like(logits)
            probs.scatter_(-1, logits.argmax(dim=-1, keepdim=True), 1.0)
            return probs
        return F.softmax(logits / self.temperature, dim=-1)

    def get_stats(self) -> dict:
        return {
            "acceptance_rate": self.stats.acceptance_rate,
            "avg_accepted_per_round": self.stats.avg_accepted_per_round,
            "total_rounds": self.stats.rounds,
            "total_draft": self.stats.total_draft,
            "total_accepted": self.stats.accepted,
        }
