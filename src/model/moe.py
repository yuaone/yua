"""Mixture-of-Experts FFN for YUA 1.0.

MoE replaces the dense FFN in TransformerBlock with:
  Router → Top-K Expert Selection → Weighted Combine

Compatible with existing FeedForward interface:
  input:  (batch, seq_len, d_model)
  output: (batch, seq_len, d_model)

Design based on:
  - Switch Transformer (Fedus et al., 2021)
  - Mixtral (Jiang et al., 2024)
  - DeepSeekMoE (Dai et al., 2024)
"""

from __future__ import annotations

import math
from typing import Optional

import torch
import torch.nn as nn
import torch.nn.functional as F

from .config import YuaConfig
from .ffn import FeedForward

__all__ = ["MoEFFN", "TopKRouter"]


class TopKRouter(nn.Module):
    """Top-K expert router with load balancing auxiliary loss.

    For each token, computes logits over num_experts and selects top_k.
    Returns expert indices, gating weights, and auxiliary load balance loss.
    """

    def __init__(self, config: YuaConfig) -> None:
        super().__init__()
        self.num_experts = config.moe_num_experts
        self.top_k = config.moe_top_k
        self.aux_loss_coef = config.moe_router_aux_loss_coef
        self.z_loss_coef = config.moe_router_z_loss_coef

        self.init_std = config.moe_router_init_std

        # Router: d_model → num_experts
        self.gate = nn.Linear(config.d_model, self.num_experts, bias=False)
        self._init_weights()

    def _init_weights(self) -> None:
        nn.init.normal_(self.gate.weight, mean=0.0, std=self.init_std)
        self.gate._yua_initialized = True

    def forward(
        self, x: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Route tokens to experts.

        Args:
            x: (batch, seq_len, d_model)

        Returns:
            expert_indices: (batch, seq_len, top_k) — selected expert ids
            expert_weights: (batch, seq_len, top_k) — softmax gating weights
            aux_loss: scalar — load balancing + z-loss
        """
        B, S, D = x.shape

        # Router logits: (B, S, num_experts) — compute in fp32 for bf16 stability
        logits = self.gate(x).float()

        # Top-K selection
        weights = F.softmax(logits, dim=-1)
        top_weights, top_indices = torch.topk(weights, self.top_k, dim=-1)

        # Normalize top-k weights to sum to 1
        top_weights = top_weights / top_weights.sum(dim=-1, keepdim=True)

        # === Auxiliary losses ===
        aux_loss = torch.tensor(0.0, device=x.device, dtype=torch.float32)

        if self.training:
            # Load balance loss (Switch Transformer style)
            # Encourages uniform expert utilization
            # f_i = fraction of tokens routed to expert i
            # P_i = fraction of router probability allocated to expert i
            # loss = num_experts * sum(f_i * P_i)
            # Count dispatch events per expert (standard Mixtral/ST-MoE approach)
            # Each top-k slot is one dispatch event, total = B*S*top_k
            tokens_per_expert = torch.zeros(
                self.num_experts, device=x.device, dtype=torch.float32
            )
            flat_indices = top_indices.view(-1)  # (B*S*top_k,)
            ones = torch.ones_like(flat_indices, dtype=torch.float32)
            tokens_per_expert.scatter_add_(0, flat_indices, ones)

            f = tokens_per_expert / (B * S * self.top_k)  # proper fraction: sum(f)=1
            P = weights.mean(dim=(0, 1))  # mean router probability

            balance_loss = self.num_experts * (f * P).sum()
            aux_loss = aux_loss + self.aux_loss_coef * balance_loss

            # Z-loss (router logit regularization)
            # Prevents router logits from growing too large
            z_loss = torch.logsumexp(logits, dim=-1).square().mean()
            aux_loss = aux_loss + self.z_loss_coef * z_loss

        return top_indices, top_weights, aux_loss


class MoEFFN(nn.Module):
    """Mixture-of-Experts Feed-Forward Network.

    Replaces dense FeedForward with N expert FFNs + router.
    Each expert is an independent SwiGLU/GELU FFN.
    Per token, only top_k experts are activated.

    Supports:
      - Shared experts (DeepSeek style): always-active base expert
      - Load balancing auxiliary loss
      - Z-loss regularization
    """

    def __init__(self, config: YuaConfig) -> None:
        super().__init__()
        self.config = config
        self.num_experts = config.moe_num_experts
        self.top_k = config.moe_top_k
        self.num_shared = config.moe_shared_experts
        self.shared_scale = config.moe_shared_scale
        self.capacity_factor = config.moe_capacity_factor

        # Router
        self.router = TopKRouter(config)

        # Expert FFNs (each is a full FeedForward)
        self.experts = nn.ModuleList(
            [FeedForward(config) for _ in range(self.num_experts)]
        )

        # Shared experts (always active, DeepSeek style)
        if self.num_shared > 0:
            self.shared_experts = nn.ModuleList(
                [FeedForward(config) for _ in range(self.num_shared)]
            )
        else:
            self.shared_experts = None

    def forward(
        self, x: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """Forward pass with MoE routing.

        Args:
            x: (batch, seq_len, d_model)

        Returns:
            output: (batch, seq_len, d_model)
            aux_loss: scalar (load balance + z-loss)
        """
        B, S, D = x.shape

        # Route tokens to experts
        expert_indices, expert_weights, aux_loss = self.router(x)

        # Expert capacity: max tokens each expert should handle
        expert_capacity = int(math.ceil(B * S * self.top_k / self.num_experts * self.capacity_factor))

        # Compute expert outputs — autograd-safe (no in-place mask ops)
        output = torch.zeros_like(x)
        combined_weight = torch.zeros(B, S, 1, device=x.device, dtype=torch.float32)

        for expert_idx in range(self.num_experts):
            # Collect positions and weights across all top_k slots
            pos_list = []
            weight_list = []
            for k in range(self.top_k):
                mask = (expert_indices[:, :, k] == expert_idx)  # (B, S) bool
                if not mask.any():
                    continue
                pos = mask.nonzero(as_tuple=False)       # [N, 2] — (batch_idx, seq_idx)
                w = expert_weights[:, :, k][mask]         # [N]
                pos_list.append(pos)
                weight_list.append(w)

            if not pos_list:
                continue

            pos = torch.cat(pos_list, dim=0)   # [total_tokens, 2]
            w = torch.cat(weight_list, dim=0)  # [total_tokens]

            # Capacity limit: keep highest-weight tokens (not FIFO)
            if pos.shape[0] > expert_capacity:
                keep = torch.topk(w, k=expert_capacity, dim=0, sorted=False).indices
                pos = pos[keep]
                w = w[keep]

            # Gather expert input using advanced indexing (no in-place)
            expert_input = x[pos[:, 0], pos[:, 1]]  # [num_tokens, D]

            # Run through expert
            expert_output = self.experts[expert_idx](expert_input)

            # Weighted scatter-add back (accumulate=True avoids in-place on output)
            scatter_w = w.to(expert_output.dtype).unsqueeze(-1)  # [num_tokens, 1]
            scatter_w_fp32 = w.to(torch.float32).unsqueeze(-1)   # fp32 for renorm precision
            output.index_put_(
                (pos[:, 0], pos[:, 1]),
                expert_output * scatter_w,
                accumulate=True,
            )
            # Track combined weight in fp32 for renormalization after capacity drops
            combined_weight.index_put_(
                (pos[:, 0], pos[:, 1]),
                scatter_w_fp32,
                accumulate=True,
            )

        # Renormalize: if tokens were dropped due to capacity, combined_weight < 1
        output = torch.where(
            combined_weight > 0,
            output / combined_weight.clamp_min(1e-9).to(output.dtype),
            output,
        )

        # Add shared expert output (always active, scaled)
        if self.shared_experts is not None:
            shared_out = torch.zeros_like(x)
            for shared in self.shared_experts:
                shared_out = shared_out + shared(x)
            output = output + self.shared_scale * (shared_out / self.num_shared)

        return output, aux_loss


def create_ffn(config: YuaConfig) -> nn.Module:
    """Factory function: create Dense FFN or MoE FFN based on config.

    Usage in TransformerBlock:
        self.ffn = create_ffn(config)
    """
    if config.ffn_type == "moe" and config.moe_num_experts > 0:
        return MoEFFN(config)
    else:
        return FeedForward(config)
