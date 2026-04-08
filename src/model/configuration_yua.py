"""YUA Model Configuration.

HuggingFace-compatible config for YUA MoE architecture.
Supports both current 9.45B (Mixtral-style) and Gen2 (YUA-native).
"""

from transformers import PretrainedConfig


class YuaConfig(PretrainedConfig):
    model_type = "yua"
    keys_to_ignore_at_inference = ["past_key_values"]

    def __init__(
        self,
        vocab_size: int = 128008,
        hidden_size: int = 2048,
        intermediate_size: int = 5461,
        num_hidden_layers: int = 32,
        num_attention_heads: int = 32,
        num_key_value_heads: int = 8,
        head_dim: int = 64,
        max_position_embeddings: int = 4096,
        rope_theta: float = 500000.0,
        rms_norm_eps: float = 1e-5,
        hidden_act: str = "silu",
        tie_word_embeddings: bool = False,
        use_qk_norm: bool = True,
        # MoE
        num_dense_layers: int = 0,
        num_experts_per_tok: int = 2,
        num_local_experts: int = 8,
        num_shared_experts: int = 0,
        router_type: str = "topk",  # "topk" or "relu"
        router_aux_loss_coef: float = 0.01,
        # MTP
        mtp_enabled: bool = False,
        num_mtp_heads: int = 2,
        mtp_loss_weight: float = 0.1,
        **kwargs,
    ):
        self.vocab_size = vocab_size
        self.hidden_size = hidden_size
        self.intermediate_size = intermediate_size
        self.num_hidden_layers = num_hidden_layers
        self.num_attention_heads = num_attention_heads
        self.num_key_value_heads = num_key_value_heads
        self.head_dim = head_dim
        self.max_position_embeddings = max_position_embeddings
        self.rope_theta = rope_theta
        self.rms_norm_eps = rms_norm_eps
        self.hidden_act = hidden_act
        self.use_qk_norm = use_qk_norm
        # MoE
        self.num_dense_layers = num_dense_layers
        self.num_experts_per_tok = num_experts_per_tok
        self.num_local_experts = num_local_experts
        self.num_shared_experts = num_shared_experts
        self.router_type = router_type
        self.router_aux_loss_coef = router_aux_loss_coef
        # MTP
        self.mtp_enabled = mtp_enabled
        self.num_mtp_heads = num_mtp_heads
        self.mtp_loss_weight = mtp_loss_weight

        super().__init__(tie_word_embeddings=tie_word_embeddings, **kwargs)
