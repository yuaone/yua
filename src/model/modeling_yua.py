"""YUA Model — HuggingFace-compatible MoE LLM.

Supports:
- Dense layers (layer_idx < num_dense_layers)
- MoE layers with optional shared expert
- TopK or ReLU routing
- GQA + RoPE + QK-norm
- Multi-Token Prediction (training only)

Usage:
    from transformers import AutoModelForCausalLM
    model = AutoModelForCausalLM.from_pretrained(
        "jungwon-ai/YUA-MoE-9.45B",
        trust_remote_code=True,
        torch_dtype=torch.bfloat16,
    )
"""

import math
from typing import Optional, Tuple, List

import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import PreTrainedModel
from transformers.modeling_outputs import (
    BaseModelOutputWithPast,
    CausalLMOutputWithPast,
)

from .configuration_yua import YuaConfig


# ============================================================
# Basic Modules
# ============================================================

class YuaRMSNorm(nn.Module):
    def __init__(self, hidden_size: int, eps: float = 1e-5):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(hidden_size))
        self.eps = eps

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        input_dtype = x.dtype
        x = x.to(torch.float32)
        variance = x.pow(2).mean(-1, keepdim=True)
        x = x * torch.rsqrt(variance + self.eps)
        return (self.weight * x).to(input_dtype)


class YuaRotaryEmbedding(nn.Module):
    def __init__(self, dim: int, max_position_embeddings: int, theta: float = 500000.0):
        super().__init__()
        self.dim = dim
        self.max_position_embeddings = max_position_embeddings
        inv_freq = 1.0 / (theta ** (torch.arange(0, dim, 2, dtype=torch.float32) / dim))
        self.register_buffer("inv_freq", inv_freq, persistent=False)

    def forward(self, x: torch.Tensor, position_ids: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        # position_ids: (batch_size, seq_len) or (1, seq_len)
        freqs = position_ids.float().unsqueeze(-1) * self.inv_freq  # (batch, seq, dim//2)
        emb = torch.cat([freqs, freqs], dim=-1)  # (batch, seq, dim)
        return emb.cos(), emb.sin()


def rotate_half(x: torch.Tensor) -> torch.Tensor:
    x1 = x[..., : x.shape[-1] // 2]
    x2 = x[..., x.shape[-1] // 2 :]
    return torch.cat((-x2, x1), dim=-1)


def apply_rotary_pos_emb(
    q: torch.Tensor, k: torch.Tensor, cos: torch.Tensor, sin: torch.Tensor
) -> Tuple[torch.Tensor, torch.Tensor]:
    """Apply RoPE. cos/sin shape: (batch, 1, seq, dim)."""
    q_embed = (q * cos) + (rotate_half(q) * sin)
    k_embed = (k * cos) + (rotate_half(k) * sin)
    return q_embed, k_embed


# ============================================================
# Attention
# ============================================================

class YuaAttention(nn.Module):
    def __init__(self, config: YuaConfig, layer_idx: int):
        super().__init__()
        self.config = config
        self.layer_idx = layer_idx
        self.num_heads = config.num_attention_heads
        self.num_kv_heads = config.num_key_value_heads
        self.head_dim = config.head_dim
        self.num_kv_groups = self.num_heads // self.num_kv_heads

        self.q_proj = nn.Linear(config.hidden_size, self.num_heads * self.head_dim, bias=False)
        self.k_proj = nn.Linear(config.hidden_size, self.num_kv_heads * self.head_dim, bias=False)
        self.v_proj = nn.Linear(config.hidden_size, self.num_kv_heads * self.head_dim, bias=False)
        self.o_proj = nn.Linear(self.num_heads * self.head_dim, config.hidden_size, bias=False)

        self.use_qk_norm = config.use_qk_norm
        if self.use_qk_norm:
            self.q_norm = YuaRMSNorm(self.head_dim, eps=config.rms_norm_eps)
            self.k_norm = YuaRMSNorm(self.head_dim, eps=config.rms_norm_eps)

        self.rotary_emb = YuaRotaryEmbedding(
            self.head_dim,
            max_position_embeddings=config.max_position_embeddings,
            theta=config.rope_theta,
        )

    def forward(
        self,
        hidden_states: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
        position_ids: Optional[torch.LongTensor] = None,
        past_key_value: Optional[Tuple[torch.Tensor, torch.Tensor]] = None,
        use_cache: bool = False,
    ) -> Tuple[torch.Tensor, Optional[Tuple[torch.Tensor, torch.Tensor]]]:
        bsz, seq_len, _ = hidden_states.shape

        q = self.q_proj(hidden_states).view(bsz, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(hidden_states).view(bsz, seq_len, self.num_kv_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(hidden_states).view(bsz, seq_len, self.num_kv_heads, self.head_dim).transpose(1, 2)

        if self.use_qk_norm:
            q = self.q_norm(q)
            k = self.k_norm(k)

        if position_ids is None:
            position_ids = torch.arange(seq_len, device=hidden_states.device).unsqueeze(0)

        cos, sin = self.rotary_emb(hidden_states, position_ids)  # (batch, seq, dim)
        cos = cos.unsqueeze(1)  # (batch, 1, seq, dim)
        sin = sin.unsqueeze(1)  # (batch, 1, seq, dim)
        q = (q * cos) + (rotate_half(q) * sin)
        k = (k * cos) + (rotate_half(k) * sin)

        if past_key_value is not None:
            k = torch.cat([past_key_value[0], k], dim=2)
            v = torch.cat([past_key_value[1], v], dim=2)

        new_kv = (k, v) if use_cache else None

        # GQA: repeat KV heads
        if self.num_kv_groups > 1:
            k = k.repeat_interleave(self.num_kv_groups, dim=1)
            v = v.repeat_interleave(self.num_kv_groups, dim=1)

        # Scaled dot-product attention
        is_causal = attention_mask is None and past_key_value is None
        sdpa_mask = None
        if attention_mask is not None and attention_mask.dim() == 2:
            # Convert (batch, kv_len) padding mask to (batch, 1, 1, kv_len) float mask
            sdpa_mask = (1.0 - attention_mask[:, None, None, :].to(q.dtype)) * torch.finfo(q.dtype).min
        elif attention_mask is not None:
            sdpa_mask = attention_mask

        attn_output = F.scaled_dot_product_attention(
            q, k, v,
            attn_mask=sdpa_mask,
            is_causal=is_causal,
        )

        attn_output = attn_output.transpose(1, 2).contiguous().view(bsz, seq_len, -1)
        attn_output = self.o_proj(attn_output)

        return attn_output, new_kv


# ============================================================
# FFN & MoE
# ============================================================

class YuaSwiGLUMLP(nn.Module):
    def __init__(self, hidden_size: int, intermediate_size: int):
        super().__init__()
        self.gate_proj = nn.Linear(hidden_size, intermediate_size, bias=False)
        self.up_proj = nn.Linear(hidden_size, intermediate_size, bias=False)
        self.down_proj = nn.Linear(intermediate_size, hidden_size, bias=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.down_proj(F.silu(self.gate_proj(x)) * self.up_proj(x))


class YuaTopKRouter(nn.Module):
    """Standard TopK + Softmax routing (Mixtral-style)."""

    def __init__(self, hidden_size: int, num_experts: int, top_k: int):
        super().__init__()
        self.gate = nn.Linear(hidden_size, num_experts, bias=False)
        self.top_k = top_k

    def forward(self, hidden_states: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        logits = self.gate(hidden_states)
        topk_weight, topk_idx = torch.topk(logits, self.top_k, dim=-1)
        topk_weight = F.softmax(topk_weight, dim=-1)
        return topk_weight, topk_idx


class YuaReLURouter(nn.Module):
    """ReLU routing — aux-loss-free (ReMoE, ICLR 2025)."""

    def __init__(self, hidden_size: int, num_experts: int, top_k: int):
        super().__init__()
        self.gate = nn.Linear(hidden_size, num_experts, bias=False)
        self.top_k = top_k

    def forward(self, hidden_states: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        logits = self.gate(hidden_states)
        scores = F.relu(logits)
        topk_weight, topk_idx = torch.topk(scores, self.top_k, dim=-1)
        topk_weight = topk_weight / (topk_weight.sum(dim=-1, keepdim=True) + 1e-6)
        return topk_weight, topk_idx


class YuaSparseMoE(nn.Module):
    """Sparse MoE with optional shared expert."""

    def __init__(self, config: YuaConfig):
        super().__init__()
        self.num_experts = config.num_local_experts
        self.top_k = config.num_experts_per_tok
        self.hidden_size = config.hidden_size

        # Router
        if config.router_type == "relu":
            self.router = YuaReLURouter(config.hidden_size, self.num_experts, self.top_k)
        else:
            self.router = YuaTopKRouter(config.hidden_size, self.num_experts, self.top_k)

        # Routed experts
        self.experts = nn.ModuleList([
            YuaSwiGLUMLP(config.hidden_size, config.intermediate_size)
            for _ in range(self.num_experts)
        ])

        # Shared expert (optional)
        self.num_shared_experts = config.num_shared_experts
        if self.num_shared_experts > 0:
            self.shared_expert = YuaSwiGLUMLP(config.hidden_size, config.intermediate_size)

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        batch_size, seq_len, hidden_dim = hidden_states.shape
        flat = hidden_states.view(-1, hidden_dim)
        num_tokens = flat.shape[0]

        # Shared expert (always active)
        if self.num_shared_experts > 0:
            shared_out = self.shared_expert(flat)
        else:
            shared_out = torch.zeros_like(flat)

        # Routed experts
        topk_weight, topk_idx = self.router(flat)
        routed_out = torch.zeros_like(flat)

        for k in range(self.top_k):
            expert_indices = topk_idx[:, k]
            weights = topk_weight[:, k].unsqueeze(-1)
            for eid in range(self.num_experts):
                mask = expert_indices == eid
                if mask.any():
                    token_subset = flat[mask]
                    expert_output = self.experts[eid](token_subset)
                    routed_out[mask] += weights[mask] * expert_output

        output = shared_out + routed_out
        return output.view(batch_size, seq_len, hidden_dim)


# ============================================================
# Decoder Layer
# ============================================================

class YuaDecoderLayer(nn.Module):
    def __init__(self, config: YuaConfig, layer_idx: int):
        super().__init__()
        self.layer_idx = layer_idx
        self.self_attn = YuaAttention(config, layer_idx)
        self.input_layernorm = YuaRMSNorm(config.hidden_size, eps=config.rms_norm_eps)
        self.post_attention_layernorm = YuaRMSNorm(config.hidden_size, eps=config.rms_norm_eps)

        is_dense = layer_idx < config.num_dense_layers
        if is_dense:
            self.mlp = YuaSwiGLUMLP(config.hidden_size, config.intermediate_size)
        else:
            self.mlp = YuaSparseMoE(config)

    def forward(
        self,
        hidden_states: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
        position_ids: Optional[torch.LongTensor] = None,
        past_key_value: Optional[Tuple[torch.Tensor, torch.Tensor]] = None,
        use_cache: bool = False,
    ) -> Tuple[torch.Tensor, Optional[Tuple[torch.Tensor, torch.Tensor]]]:
        # Self Attention
        residual = hidden_states
        hidden_states = self.input_layernorm(hidden_states)
        hidden_states, present_kv = self.self_attn(
            hidden_states, attention_mask, position_ids, past_key_value, use_cache
        )
        hidden_states = residual + hidden_states

        # FFN (Dense or MoE)
        residual = hidden_states
        hidden_states = self.post_attention_layernorm(hidden_states)
        hidden_states = self.mlp(hidden_states)
        hidden_states = residual + hidden_states

        return hidden_states, present_kv


# ============================================================
# Model
# ============================================================

class YuaPreTrainedModel(PreTrainedModel):
    config_class = YuaConfig
    base_model_prefix = "model"
    supports_gradient_checkpointing = True
    _no_split_modules = ["YuaDecoderLayer"]
    _supports_sdpa = True
    _supports_cache_class = False

    def _init_weights(self, module: nn.Module):
        std = 0.02
        if isinstance(module, nn.Linear):
            module.weight.data.normal_(mean=0.0, std=std)
            if module.bias is not None:
                module.bias.data.zero_()
        elif isinstance(module, nn.Embedding):
            module.weight.data.normal_(mean=0.0, std=std)
        elif isinstance(module, YuaRMSNorm):
            module.weight.data.fill_(1.0)


class YuaModel(YuaPreTrainedModel):

    def __init__(self, config: YuaConfig):
        super().__init__(config)
        self.embed_tokens = nn.Embedding(config.vocab_size, config.hidden_size)
        self.layers = nn.ModuleList([
            YuaDecoderLayer(config, i) for i in range(config.num_hidden_layers)
        ])
        self.norm = YuaRMSNorm(config.hidden_size, eps=config.rms_norm_eps)
        self.gradient_checkpointing = False
        self.post_init()

    def forward(
        self,
        input_ids: Optional[torch.LongTensor] = None,
        attention_mask: Optional[torch.Tensor] = None,
        position_ids: Optional[torch.LongTensor] = None,
        past_key_values: Optional[List[Tuple[torch.Tensor, torch.Tensor]]] = None,
        use_cache: Optional[bool] = None,
    ) -> BaseModelOutputWithPast:
        hidden_states = self.embed_tokens(input_ids)

        use_cache = use_cache if use_cache is not None else self.config.use_cache if hasattr(self.config, 'use_cache') else False
        next_cache = [] if use_cache else None

        for idx, layer in enumerate(self.layers):
            past_kv = past_key_values[idx] if past_key_values is not None else None

            if self.gradient_checkpointing and self.training:
                hidden_states, present_kv = torch.utils.checkpoint.checkpoint(
                    layer, hidden_states, attention_mask, position_ids, past_kv, use_cache,
                    use_reentrant=False,
                )
            else:
                hidden_states, present_kv = layer(
                    hidden_states, attention_mask, position_ids, past_kv, use_cache
                )

            if use_cache:
                next_cache.append(present_kv)

        hidden_states = self.norm(hidden_states)

        return BaseModelOutputWithPast(
            last_hidden_state=hidden_states,
            past_key_values=next_cache if use_cache else None,
        )


class YuaForCausalLM(YuaPreTrainedModel):
    _tied_weights_keys = []

    def __init__(self, config: YuaConfig):
        super().__init__(config)
        self.model = YuaModel(config)
        self.lm_head = nn.Linear(config.hidden_size, config.vocab_size, bias=False)

        # MTP heads (training only)
        if config.mtp_enabled:
            self.mtp_heads = nn.ModuleList([
                nn.Linear(config.hidden_size, config.vocab_size, bias=False)
                for _ in range(config.num_mtp_heads)
            ])

        self.post_init()

    def get_input_embeddings(self):
        return self.model.embed_tokens

    def set_input_embeddings(self, value):
        self.model.embed_tokens = value

    def get_output_embeddings(self):
        return self.lm_head

    def set_output_embeddings(self, new_embeddings):
        self.lm_head = new_embeddings

    def forward(
        self,
        input_ids: Optional[torch.LongTensor] = None,
        attention_mask: Optional[torch.Tensor] = None,
        position_ids: Optional[torch.LongTensor] = None,
        past_key_values: Optional[List[Tuple[torch.Tensor, torch.Tensor]]] = None,
        labels: Optional[torch.LongTensor] = None,
        use_cache: Optional[bool] = None,
        **kwargs,
    ) -> CausalLMOutputWithPast:
        outputs = self.model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            position_ids=position_ids,
            past_key_values=past_key_values,
            use_cache=use_cache,
        )

        hidden_states = outputs.last_hidden_state
        logits = self.lm_head(hidden_states)

        loss = None
        if labels is not None:
            shift_logits = logits[..., :-1, :].contiguous()
            shift_labels = labels[..., 1:].contiguous()
            loss = F.cross_entropy(
                shift_logits.view(-1, self.config.vocab_size),
                shift_labels.view(-1),
                ignore_index=-100,
            )

            # MTP loss (training only)
            if self.config.mtp_enabled and hasattr(self, 'mtp_heads'):
                for i, mtp_head in enumerate(self.mtp_heads):
                    offset = i + 2  # predict token t+2, t+3, ...
                    if hidden_states.shape[1] > offset:
                        mtp_logits = mtp_head(hidden_states[:, :-offset, :])
                        mtp_labels = labels[:, offset:]
                        min_len = min(mtp_logits.shape[1], mtp_labels.shape[1])
                        mtp_loss = F.cross_entropy(
                            mtp_logits[:, :min_len, :].contiguous().view(-1, self.config.vocab_size),
                            mtp_labels[:, :min_len].contiguous().view(-1),
                            ignore_index=-100,
                        )
                        loss = loss + self.config.mtp_loss_weight * mtp_loss

        return CausalLMOutputWithPast(
            loss=loss,
            logits=logits,
            past_key_values=outputs.past_key_values,
        )

    def prepare_inputs_for_generation(
        self,
        input_ids: torch.LongTensor,
        past_key_values: Optional[List[Tuple[torch.Tensor, torch.Tensor]]] = None,
        attention_mask: Optional[torch.Tensor] = None,
        **kwargs,
    ):
        if past_key_values is not None:
            input_ids = input_ids[:, -1:]

        position_ids = None
        if attention_mask is not None:
            position_ids = attention_mask.long().cumsum(-1) - 1
            position_ids.masked_fill_(attention_mask == 0, 1)
            if past_key_values is not None:
                position_ids = position_ids[:, -1:]

        return {
            "input_ids": input_ids,
            "past_key_values": past_key_values,
            "attention_mask": attention_mask,
            "position_ids": position_ids,
            "use_cache": True,
        }
