"""YUA 1.0 model configuration dataclass."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

__all__ = ["YuaConfig"]


@dataclass
class YuaConfig:
    """Configuration for the YUA 1.0 dense decoder-only Transformer.

    Supports scales S1 (125M) through S5 (70B).
    """

    name: str = "yua1.0-125m"
    n_layers: int = 12
    d_model: int = 768
    n_heads: int = 12
    head_dim: int = 64
    ffn_dim: int = 3072
    vocab_size: int = 128_000
    context_length: int = 2048
    dropout: float = 0.0
    bias: bool = False
    norm_type: str = "rmsnorm"  # "rmsnorm" | "layernorm"
    position_encoding: str = "rope"  # was "alibi", rope is modern standard
    activation: str = "swiglu"  # was "gelu", swiglu is better for LLMs
    tie_embeddings: bool = True
    gqa_groups: int = 0  # 0 = standard MHA, >0 = GQA with this many KV heads
    qk_norm: bool = True  # QK-Norm: RMSNorm on Q/K per head (Qwen 3, Gemma 3, OLMo 2)

    # SwiGLU activation clamping limit (upper bound for SiLU output)
    swiglu_limit: float = 7.0

    # Normalization epsilon values
    norm_eps: float = 1e-6             # RMSNorm / LayerNorm eps for transformer blocks
    qk_norm_eps: float = 1e-6         # QK-Norm RMSNorm eps
    embedding_norm_eps: float = 1e-6  # EmbeddingRMSNorm eps

    # Attention implementation: "auto" | "flash" | "sdpa" | "naive"
    attn_impl: str = "auto"

    # Attention logit soft-capping (Gemma 2 style). None = disabled.
    attn_logit_softcap: Optional[float] = None

    # AttnRes: "standard" (default) | "block" (Block Attention Residuals)
    attn_res: str = "standard"
    # NOTE: current implementation uses per-layer gate, not block-shared gate.
    # Block-shared gate (sharing one gate across attn_res_block_size layers) is not yet implemented.
    attn_res_block_size: int = 4  # layers per block for Block AttnRes (reserved for future block-shared impl)
    attn_res_alpha: float = 0.1   # gate range: 1.0 ± alpha (ablation: 0.1/0.2/0.3)
    ffn_res_alpha: float = 0.1    # gate range: 1.0 ± alpha

    # Multi-Token Prediction (MTP)
    # 0 = disabled (standard next-token only), 2-4 = number of future prediction heads
    mtp_num_heads: int = 0
    mtp_loss_weight: float = 0.1  # weight for auxiliary MTP loss

    # Embedding scaling: multiply by sqrt(d_model) (Vaswani et al.)
    # False is better with tie_embeddings (weight tying consistency)
    embed_scaling: bool = False  # was True, False is better with tie_embeddings

    # Embedding upgrades (all disabled by default for backward compat)
    embed_dim: Optional[int] = None          # None => same as d_model (no factorization)
    embedding_rmsnorm: bool = False          # False => no norm after embedding
    n_languages: int = 0                     # 0 => no language embedding
    language_embed_scale: float = 0.25       # scale for language embedding addition

    # FFN type: "dense" (standard) | "moe" (Mixture-of-Experts)
    ffn_type: str = "dense"

    # MoE parameters (only used when ffn_type == "moe")
    moe_num_experts: int = 0        # total number of experts (e.g., 8, 16, 64)
    moe_top_k: int = 2              # experts activated per token
    moe_capacity_factor: float = 1.25  # expert capacity buffer
    moe_router_aux_loss_coef: float = 1e-2  # load balance loss weight
    moe_router_z_loss_coef: float = 1e-3    # router logit regularization
    moe_shared_experts: int = 0     # always-active shared experts (DeepSeek style)
    moe_router_init_std: float = 1e-3  # std for router gate weight init
    moe_shared_scale: float = 1.0      # scaling factor for shared expert output

    # Matryoshka Embedding Head (MRL — Matryoshka Representation Learning)
    matryoshka_dims: list[int] = field(default_factory=list)  # e.g., [64, 128, 256, 512]
    matryoshka_loss_weights: Optional[list[float]] = None     # per-dim weights; None = uniform

    # RoPE parameters (used only when position_encoding == "rope")
    rope_theta: float = 10_000.0

    def __post_init__(self) -> None:
        # Enum-like field validation
        if self.norm_type not in {"rmsnorm", "layernorm"}:
            raise ValueError(f"norm_type must be 'rmsnorm' or 'layernorm', got {self.norm_type!r}")
        if self.activation not in {"gelu", "swiglu"}:
            raise ValueError(f"activation must be 'gelu' or 'swiglu', got {self.activation!r}")
        if self.position_encoding not in {"rope", "alibi"}:
            raise ValueError(f"position_encoding must be 'rope' or 'alibi', got {self.position_encoding!r}")
        if self.attn_impl not in {"auto", "flash", "sdpa", "naive"}:
            raise ValueError(f"attn_impl must be 'auto', 'flash', 'sdpa', or 'naive', got {self.attn_impl!r}")
        # Numeric bound validation
        if self.attn_logit_softcap is not None and self.attn_logit_softcap <= 0:
            raise ValueError(f"attn_logit_softcap must be > 0 when set, got {self.attn_logit_softcap}")
        if self.swiglu_limit <= 0:
            raise ValueError(f"swiglu_limit must be > 0, got {self.swiglu_limit}")
        if self.attn_res_alpha < 0:
            raise ValueError(f"attn_res_alpha must be >= 0, got {self.attn_res_alpha}")
        if self.ffn_type not in {"dense", "moe"}:
            raise ValueError(f"ffn_type must be 'dense' or 'moe', got {self.ffn_type!r}")
        if self.ffn_type == "moe" and self.moe_num_experts < 2:
            raise ValueError(f"moe_num_experts must be >= 2 for MoE, got {self.moe_num_experts}")
        if self.moe_top_k < 1:
            raise ValueError(f"moe_top_k must be >= 1, got {self.moe_top_k}")
        if self.ffn_type == "moe" and self.moe_top_k > self.moe_num_experts:
            raise ValueError(
                f"moe_top_k ({self.moe_top_k}) must be <= moe_num_experts ({self.moe_num_experts})"
            )
        if self.moe_capacity_factor <= 0:
            raise ValueError(f"moe_capacity_factor must be > 0, got {self.moe_capacity_factor}")
        if self.moe_router_init_std <= 0:
            raise ValueError(f"moe_router_init_std must be > 0, got {self.moe_router_init_std}")
        if self.moe_shared_scale < 0:
            raise ValueError(f"moe_shared_scale must be >= 0, got {self.moe_shared_scale}")
        if self.ffn_res_alpha < 0:
            raise ValueError(f"ffn_res_alpha must be >= 0, got {self.ffn_res_alpha}")
        if self.norm_eps <= 0:
            raise ValueError(f"norm_eps must be > 0, got {self.norm_eps}")
        if self.qk_norm_eps <= 0:
            raise ValueError(f"qk_norm_eps must be > 0, got {self.qk_norm_eps}")
        if self.embedding_norm_eps <= 0:
            raise ValueError(f"embedding_norm_eps must be > 0, got {self.embedding_norm_eps}")

        assert self.d_model % self.n_heads == 0 or self.head_dim > 0, (
            "d_model must be divisible by n_heads, or head_dim must be set explicitly"
        )
        if self.gqa_groups > 0:
            assert self.n_heads % self.gqa_groups == 0, (
                f"n_heads ({self.n_heads}) must be divisible by gqa_groups ({self.gqa_groups})"
            )
        if self.head_dim > 0 and self.n_heads * self.head_dim != self.d_model:
            raise ValueError(
                f"n_heads({self.n_heads}) * head_dim({self.head_dim}) = "
                f"{self.n_heads * self.head_dim} != d_model({self.d_model})"
            )
        if self.position_encoding == "rope" and self.head_dim % 2 != 0:
            raise ValueError(
                f"RoPE requires even head_dim, got {self.head_dim}"
            )
        if self.embed_dim is not None and self.embed_dim <= 0:
            raise ValueError(f"embed_dim must be > 0, got {self.embed_dim}")
        # Matryoshka validation
        if self.matryoshka_dims:
            for md in self.matryoshka_dims:
                if md <= 0 or md > self.d_model:
                    raise ValueError(
                        f"matryoshka_dims entries must be in (0, d_model={self.d_model}], got {md}"
                    )
            if len(set(self.matryoshka_dims)) != len(self.matryoshka_dims):
                raise ValueError(
                    f"matryoshka_dims must contain unique values, got {self.matryoshka_dims}"
                )
            if sorted(self.matryoshka_dims) != list(self.matryoshka_dims):
                raise ValueError(
                    f"matryoshka_dims must be sorted ascending, got {self.matryoshka_dims}"
                )
            if self.matryoshka_loss_weights is not None:
                if len(self.matryoshka_loss_weights) != len(self.matryoshka_dims):
                    raise ValueError(
                        f"matryoshka_loss_weights length ({len(self.matryoshka_loss_weights)}) "
                        f"must match matryoshka_dims length ({len(self.matryoshka_dims)})"
                    )
                for w in self.matryoshka_loss_weights:
                    if w < 0:
                        raise ValueError(
                            f"matryoshka_loss_weights must be non-negative, got {w}"
                        )
                if sum(self.matryoshka_loss_weights) <= 0:
                    raise ValueError(
                        "matryoshka_loss_weights must sum to > 0"
                    )

    @property
    def effective_embed_dim(self) -> int:
        """Embedding dimension: embed_dim if set, otherwise d_model (no factorization)."""
        return self.embed_dim if self.embed_dim is not None else self.d_model

    @property
    def n_kv_heads(self) -> int:
        """Number of key/value heads (equals n_heads for MHA, gqa_groups for GQA)."""
        return self.gqa_groups if self.gqa_groups > 0 else self.n_heads

    @classmethod
    def from_yaml(cls, path: str | Path) -> "YuaConfig":
        """Load configuration from a YAML file.

        Expects the YAML to have a top-level ``model:`` key.
        """
        import yaml

        path = Path(path)
        with open(path, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f)

        model_cfg = raw.get("model", raw)

        # Map YAML field names to dataclass field names
        field_map = {
            "norm": "norm_type",
        }
        mapped = {}
        for k, v in model_cfg.items():
            mapped_key = field_map.get(k, k)
            mapped[mapped_key] = v

        # Filter to only known fields
        known = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in mapped.items() if k in known}
        return cls(**filtered)

    def _estimate_ffn_params(self, num_expert_copies: int = 1) -> int:
        """Estimate FFN params for a single layer.

        Args:
            num_expert_copies: how many expert copies to count
                (all experts for total, top_k for active).
        """
        if self.activation == "swiglu":
            single_ffn = 3 * self.d_model * self.ffn_dim
        else:
            single_ffn = 2 * self.d_model * self.ffn_dim

        if self.ffn_type == "moe" and self.moe_num_experts > 0:
            ffn_params = single_ffn * num_expert_copies
            # Router params
            ffn_params += self.d_model * self.moe_num_experts
            # Shared experts
            ffn_params += single_ffn * self.moe_shared_experts
        else:
            ffn_params = single_ffn
        return ffn_params

    def estimate_total_params(self) -> int:
        """Rough total parameter count (all experts included)."""
        kv_heads = self.n_kv_heads
        attn_params = (
            self.d_model * self.n_heads * self.head_dim
            + self.d_model * kv_heads * self.head_dim * 2
            + self.n_heads * self.head_dim * self.d_model
        )
        # QK-Norm: RMSNorm weight per head for Q and K
        if self.qk_norm:
            attn_params += 2 * self.head_dim  # q_norm + k_norm
        ffn_params = self._estimate_ffn_params(
            num_expert_copies=self.moe_num_experts if self.ffn_type == "moe" else 1
        )
        norm_params = 2 * self.d_model
        if self.norm_type == "layernorm" and self.bias:
            norm_params += 2 * self.d_model  # LayerNorm bias
        if self.attn_res == "block":
            norm_params += 2  # attn_gate_raw + ffn_gate_raw
        layer_params = attn_params + ffn_params + norm_params
        total = layer_params * self.n_layers
        # Embedding params
        eed = self.effective_embed_dim
        emb_params = self.vocab_size * eed
        # Factorized embedding projection: embed_dim -> d_model
        if eed != self.d_model:
            emb_params += eed * self.d_model
        # Language embedding
        if self.n_languages > 0:
            emb_params += self.n_languages * self.d_model
        if self.embedding_rmsnorm:
            emb_params += self.d_model
        # Output projection (separate if not tied)
        if not self.tie_embeddings:
            emb_params += self.d_model * self.vocab_size
        # Final norm
        final_norm_params = self.d_model
        if self.norm_type == "layernorm" and self.bias:
            final_norm_params += self.d_model
        total += final_norm_params
        total += emb_params
        # Matryoshka projection head
        if self.matryoshka_dims:
            total += self.d_model * max(self.matryoshka_dims)
        return total

    def estimate_active_params(self) -> int:
        """Rough active parameter count (only top_k experts per token)."""
        kv_heads = self.n_kv_heads
        attn_params = (
            self.d_model * self.n_heads * self.head_dim
            + self.d_model * kv_heads * self.head_dim * 2
            + self.n_heads * self.head_dim * self.d_model
        )
        # QK-Norm: RMSNorm weight per head for Q and K
        if self.qk_norm:
            attn_params += 2 * self.head_dim  # q_norm + k_norm
        ffn_params = self._estimate_ffn_params(
            num_expert_copies=self.moe_top_k if self.ffn_type == "moe" else 1
        )
        norm_params = 2 * self.d_model
        if self.norm_type == "layernorm" and self.bias:
            norm_params += 2 * self.d_model
        if self.attn_res == "block":
            norm_params += 2
        layer_params = attn_params + ffn_params + norm_params
        total = layer_params * self.n_layers
        # Embedding params
        eed = self.effective_embed_dim
        emb_params = self.vocab_size * eed
        # Factorized embedding projection: embed_dim -> d_model
        if eed != self.d_model:
            emb_params += eed * self.d_model
        # Language embedding
        if self.n_languages > 0:
            emb_params += self.n_languages * self.d_model
        if self.embedding_rmsnorm:
            emb_params += self.d_model
        # Output projection (separate if not tied)
        if not self.tie_embeddings:
            emb_params += self.d_model * self.vocab_size
        final_norm_params = self.d_model
        if self.norm_type == "layernorm" and self.bias:
            final_norm_params += self.d_model
        total += final_norm_params
        total += emb_params
        if self.matryoshka_dims:
            total += self.d_model * max(self.matryoshka_dims)
        return total

    def estimate_params(self) -> int:
        """Rough parameter count estimate (backward compat — returns total)."""
        return self.estimate_total_params()
