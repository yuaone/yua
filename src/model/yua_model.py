"""Full YUA 1.0 decoder-only Transformer model."""

from __future__ import annotations

from typing import Optional

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.checkpoint import checkpoint as torch_checkpoint

from src.token_protocol import IGNORE_INDEX
from .config import YuaConfig
from .embeddings import TokenEmbedding
from .matryoshka import MatryoshkaHead
from .mtp import MTPHead, MTPLoss
from .transformer import RMSNorm, TransformerBlock

__all__ = ["YuaModel"]

# Type alias for layer-wise KV cache
PastKeyValues = list[tuple[torch.Tensor, torch.Tensor]]


class YuaModel(nn.Module):
    """YUA 1.0 dense decoder-only autoregressive Transformer.

    Architecture::

        Token Embedding -> N x TransformerBlock -> RMSNorm -> Output Projection

    The output projection can optionally share weights with the token embedding
    (controlled by ``config.tie_embeddings``).
    """

    def __init__(self, config: YuaConfig) -> None:
        super().__init__()
        self.config = config
        self._gradient_checkpointing = False
        self.last_moe_aux_loss: float | torch.Tensor | None = None

        self.embedding = TokenEmbedding(config)
        self.layers = nn.ModuleList(
            [TransformerBlock(config, layer_idx=i) for i in range(config.n_layers)]
        )

        if config.norm_type == "rmsnorm":
            self.final_norm = RMSNorm(config.d_model, eps=config.norm_eps)
        else:
            self.final_norm = nn.LayerNorm(config.d_model, eps=config.norm_eps, bias=config.bias)

        # Multi-Token Prediction auxiliary heads
        self.mtp_heads = nn.ModuleList()
        self.mtp_loss_fn: MTPLoss | None = None
        if config.mtp_num_heads > 0:
            # Determine shared projection weight for weight tying
            shared_proj_owner = (
                self.embedding.token_emb
                if config.tie_embeddings
                else None
            )
            for _ in range(config.mtp_num_heads):
                self.mtp_heads.append(
                    MTPHead(config.d_model, config.vocab_size, shared_proj_owner=shared_proj_owner)
                )
            self.mtp_loss_fn = MTPLoss(
                mtp_weight=config.mtp_loss_weight,
                chunk_size=2048,
            )

        # Matryoshka embedding head (optional, for embedding fine-tuning)
        # NOT used during pretraining CLM loss — activated via encode_embedding()
        # or by calling matryoshka_head.forward() in a separate fine-tuning loop.
        if config.matryoshka_dims:
            self.matryoshka_head = MatryoshkaHead(config)
        else:
            self.matryoshka_head = None

        # Apply weight initialization
        self.apply(self._init_base_weights)

    def gradient_checkpointing_enable(self) -> None:
        """Enable activation checkpointing to save VRAM (trades compute for memory)."""
        self._gradient_checkpointing = True

    def gradient_checkpointing_disable(self) -> None:
        """Disable activation checkpointing."""
        self._gradient_checkpointing = False

    def _migrate_state_dict(self, state_dict: dict) -> dict:
        """Migrate old checkpoint keys to current parameter names."""
        key_map = {
            # AttnRes gate: unbounded → tanh-bounded reparameterization
            "attn_gate": ("attn_gate_raw", self.config.attn_res_alpha),
            "ffn_gate": ("ffn_gate_raw", self.config.ffn_res_alpha),
        }
        new_sd = {}
        for k, v in state_dict.items():
            new_key = k
            for old_suffix, (new_suffix, alpha) in key_map.items():
                if k.endswith(old_suffix):
                    new_key = k[: -len(old_suffix)] + new_suffix
                    # Old gate was ~1.0, new raw goes through 1+alpha*tanh → invert
                    # tanh⁻¹((v-1)/alpha) but clamp to safe range
                    import math
                    if alpha <= 0:
                        v = torch.zeros_like(v)
                    else:
                        clamped = max(-0.99, min(0.99, (v.item() - 1.0) / alpha))
                        raw_value = 0.5 * math.log((1 + clamped) / (1 - clamped))
                        v = torch.full_like(v, raw_value)  # preserve shape/dtype/device
                    break
            # Reshape scalar gates to 1D for FSDP compatibility
            if ("gate_raw" in new_key) and v.dim() == 0:
                v = v.unsqueeze(0)
            new_sd[new_key] = v
        return new_sd

    @staticmethod
    def _init_base_weights(module: nn.Module) -> None:
        """Lightweight default init for modules not handled by their own _init_weights.

        Modules that set ``_yua_initialized = True`` in their ``_init_weights``
        method are skipped to preserve scaled residual init.
        """
        if isinstance(module, nn.Linear):
            if not getattr(module, "_yua_initialized", False):
                nn.init.normal_(module.weight, mean=0.0, std=0.02)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)

    # ------------------------------------------------------------------
    # Forward
    # ------------------------------------------------------------------

    def forward(
        self,
        input_ids: torch.Tensor,
        targets: Optional[torch.Tensor] = None,
        use_cache: bool = False,
        past_key_values: Optional[PastKeyValues] = None,
        inputs_embeds: Optional[torch.Tensor] = None,
        cache_position: Optional[int] = None,
        language_ids: Optional[torch.Tensor] = None,
        return_logits: Optional[bool] = None,
    ) -> tuple[Optional[torch.Tensor], Optional[torch.Tensor], Optional[PastKeyValues]]:
        """Forward pass.

        Args:
            input_ids: (batch, seq_len) token ids.
            targets: (batch, seq_len) target ids for cross-entropy loss. Optional.
            use_cache: if True, compute and return KV caches for each layer.
                Only used in inference (eval mode). Ignored during training.
            past_key_values: list of (key, value) tuples from previous forward
                pass, one per layer. Only used when use_cache=True.
            inputs_embeds: (batch, seq_len, d_model) pre-computed embeddings.
                When provided, input_ids embedding lookup is skipped (VLM용).
            language_ids: (batch, seq_len) or (batch,) language ids for
                multilingual embedding. Optional; ignored if n_languages=0.
            return_logits: whether to compute and return logits tensor.
                None (default) = auto: False when training with targets
                (memory saving), True otherwise.

        Returns:
            Tuple of (logits, loss, past_key_values).
              - logits: (batch, seq_len, vocab_size) or None if return_logits=False
              - loss: scalar or None
              - past_key_values: list of KV caches or None
        """
        # FSDP compute_dtype=bfloat16 casts ALL inputs including token IDs.
        # Force int64 here (inside forward, after FSDP hook) to prevent
        # token IDs being reinterpreted as float bit patterns.
        if input_ids is not None and input_ids.dtype != torch.long:
            input_ids = input_ids.long()
        if targets is not None and targets.dtype != torch.long:
            targets = targets.long()

        if inputs_embeds is not None:
            x = inputs_embeds
        else:
            x = self.embedding(input_ids, language_ids=language_ids)  # (B, S, D)

        # Determine whether to use cache this pass
        # Never use cache during training (gradient checkpointing incompatible)
        do_cache = use_cache and not self.training

        new_past_key_values: Optional[PastKeyValues] = [] if do_cache else None
        is_moe = self.config.ffn_type == "moe"
        moe_aux_loss = torch.tensor(0.0, device=x.device, dtype=torch.float32) if (is_moe and self.training) else None
        moe_aux_terms = 0  # count layers that contributed aux_loss

        for i, layer in enumerate(self.layers):
            layer_past_kv = past_key_values[i] if past_key_values is not None else None

            if self._gradient_checkpointing and self.training:
                # Gradient checkpointing: no cache support needed (training only)
                x, _, layer_aux = torch_checkpoint(layer, x, None, use_reentrant=False)
                if layer_aux is not None and moe_aux_loss is not None:
                    moe_aux_loss = moe_aux_loss + layer_aux
                    moe_aux_terms += 1
            else:
                x, layer_new_kv, layer_aux = layer(
                    x,
                    past_kv=layer_past_kv if do_cache else None,
                    position_offset=cache_position,
                    use_cache=do_cache,
                )
                if layer_aux is not None and moe_aux_loss is not None:
                    moe_aux_loss = moe_aux_loss + layer_aux
                    moe_aux_terms += 1
                if do_cache and new_past_key_values is not None:
                    new_past_key_values.append(layer_new_kv)

        x = self.final_norm(x)

        # Resolve return_logits default: training+targets → False (memory saving), else → True
        if return_logits is None:
            return_logits = not (self.training and targets is not None)

        loss = None
        if targets is not None:
            if self.mtp_loss_fn is not None and self.training:
                # MTP-enabled training: compute CLM + auxiliary MTP losses
                loss, _main_loss = self.mtp_loss_fn(
                    x, targets,
                    main_proj_fn=self.embedding.project_to_vocab,
                    mtp_heads=self.mtp_heads,
                )
            else:
                # Standard CLM loss (mtp_num_heads=0 or inference)
                # Chunked cross-entropy: vocab 250K에서 OOM 방지
                shift_x = x[:, :-1, :].contiguous()
                shift_targets = targets[:, 1:].contiguous().view(-1)
                # FSDP compute_dtype may cast targets to bf16 — force int for cross_entropy
                if shift_targets.is_floating_point():
                    shift_targets = shift_targets.long()

                B_S = shift_x.shape[0] * shift_x.shape[1]
                chunk_size = min(B_S, 2048)

                shift_x_flat = shift_x.view(-1, shift_x.shape[-1])
                total_loss = torch.tensor(0.0, device=shift_x.device, dtype=torch.float32)
                total_tokens = torch.tensor(0, device=shift_x.device, dtype=torch.long)

                for i in range(0, B_S, chunk_size):
                    end = min(i + chunk_size, B_S)
                    chunk_logits = self.embedding.project_to_vocab(shift_x_flat[i:end])
                    chunk_targets = shift_targets[i:end]
                    chunk_loss = F.cross_entropy(
                        chunk_logits, chunk_targets,
                        ignore_index=IGNORE_INDEX, reduction='sum',
                    )
                    total_loss += chunk_loss
                    total_tokens += (chunk_targets != IGNORE_INDEX).sum()

                loss = total_loss / total_tokens.clamp(min=1)

        # Add MoE auxiliary loss (load balance + z-loss) during training
        # Average across layers that contributed (prevents scaling with depth)
        if moe_aux_loss is not None and loss is not None:
            if moe_aux_terms > 0:
                moe_aux_loss = moe_aux_loss / moe_aux_terms
            loss = loss + moe_aux_loss
        self.last_moe_aux_loss = None if moe_aux_loss is None else float(moe_aux_loss.detach())

        logits = self.embedding.project_to_vocab(x) if return_logits else None  # (B, S, V) or None

        kv_out = new_past_key_values if do_cache else None
        return logits, loss, kv_out

    # ------------------------------------------------------------------
    # Generation
    # ------------------------------------------------------------------

    @torch.no_grad()
    def generate(
        self,
        input_ids: torch.Tensor,
        max_new_tokens: int = 64,
        temperature: float = 1.0,
        top_k: int = 0,
        top_p: float = 1.0,
        repetition_penalty: float = 1.0,
        eos_token_id: Optional[int] = None,
        suppress_token_ids: Optional[list[int]] = None,
        min_new_tokens: int = 0,
        stop_token_ids: Optional[list[int]] = None,
    ) -> torch.Tensor:
        """Autoregressive text generation with KV cache (SSOT).

        All sampling logic lives here. TextGenerator is a thin wrapper.

        Args:
            input_ids: (batch, seq_len) prompt token ids.
            max_new_tokens: number of tokens to generate.
            temperature: sampling temperature (1.0 = no change).
            top_k: if >0, only sample from top-k logits.
            top_p: nucleus sampling threshold (1.0 = disabled).
            repetition_penalty: penalize repeated tokens (1.0 = disabled).
            eos_token_id: stop generation when this token is produced.
            suppress_token_ids: list of token ids to suppress (logit=-inf).
            min_new_tokens: minimum tokens before allowing eos/stop.
            stop_token_ids: additional stop tokens (budget_forcing용).

        Returns:
            (batch, seq_len + generated) token ids.
        """
        was_training = self.training
        saved_aux_loss = self.last_moe_aux_loss  # preserve training diagnostic
        self.eval()
        try:
            generated = input_ids

            # First pass: process full prompt, build KV cache
            ctx = generated[:, -self.config.context_length:]
            logits, _, past_key_values = self.forward(ctx, use_cache=True)
            logits = logits[:, -1, :]  # last position

            # Track absolute position for RoPE (survives cache truncation)
            abs_position = ctx.shape[1]

            # Combine all stop tokens
            all_stop_ids = set()
            if eos_token_id is not None:
                all_stop_ids.add(eos_token_id)
            if stop_token_ids:
                all_stop_ids.update(stop_token_ids)

            for step in range(max_new_tokens):
                # Suppress tokens
                if suppress_token_ids:
                    logits[:, suppress_token_ids] = float("-inf")

                # Budget forcing: block stop tokens before min_new_tokens
                if step < min_new_tokens and all_stop_ids:
                    for sid in all_stop_ids:
                        logits[:, sid] = float("-inf")

                # Repetition penalty
                if repetition_penalty != 1.0:
                    for i in range(generated.shape[0]):
                        prev_tokens = generated[i].tolist()
                        for token_id in set(prev_tokens):
                            if logits[i, token_id] > 0:
                                logits[i, token_id] /= repetition_penalty
                            else:
                                logits[i, token_id] *= repetition_penalty

                # temperature=0 → greedy decoding
                if temperature <= 0:
                    next_token = logits.argmax(dim=-1, keepdim=True)
                else:
                    if temperature != 1.0:
                        logits = logits / temperature

                    # Top-k filtering
                    if top_k > 0:
                        top_vals, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                        logits[logits < top_vals[:, -1:]] = float("-inf")

                    # Top-p (nucleus) filtering
                    if top_p < 1.0:
                        sorted_logits, sorted_indices = torch.sort(logits, descending=True)
                        cumulative_probs = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)
                        # Remove tokens with cumulative probability above threshold
                        sorted_mask = cumulative_probs - F.softmax(sorted_logits, dim=-1) >= top_p
                        sorted_logits[sorted_mask] = float("-inf")
                        logits = sorted_logits.scatter(1, sorted_indices, sorted_logits)

                    probs = F.softmax(logits, dim=-1)
                    next_token = torch.multinomial(probs, num_samples=1)

                generated = torch.cat([generated, next_token], dim=1)

                # Stop check (after min_new_tokens)
                if step >= min_new_tokens and all_stop_ids:
                    if generated.shape[0] != 1:
                        raise ValueError("YuaModel.generate currently supports batch_size=1 for stop-token semantics")
                    if any(next_token[0, 0].item() == sid for sid in all_stop_ids):
                        break

                # Subsequent passes: only feed the last token, reuse KV cache
                logits, _, past_key_values = self.forward(
                    next_token, use_cache=True, past_key_values=past_key_values,
                    cache_position=abs_position,
                )
                abs_position += 1

                # Truncate KV cache if it exceeds context_length
                if past_key_values is not None:
                    max_cache = self.config.context_length
                    for idx, kv in enumerate(past_key_values):
                        if kv is None:
                            continue
                        pk, pv = kv
                        if pk.shape[2] > max_cache:
                            past_key_values[idx] = (pk[:, :, -max_cache:, :], pv[:, :, -max_cache:, :])

                logits = logits[:, -1, :]

            return generated
        finally:
            # Restore training mode and training diagnostic (prevent inference pollution)
            self.last_moe_aux_loss = saved_aux_loss
            if was_training:
                self.train()

    # ------------------------------------------------------------------
    # Embedding API (Matryoshka / retrieval)
    # ------------------------------------------------------------------

    @torch.no_grad()
    def encode_embedding(
        self,
        input_ids: torch.Tensor,
        dim: Optional[int] = None,
        pool: str = "last",
        use_projection: bool = True,
        language_ids: Optional[torch.Tensor] = None,
        attention_mask: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        """Encode input tokens into a fixed-size embedding vector.

        Args:
            input_ids: (batch, seq_len) token ids.
            dim: target embedding dimension. If None and matryoshka_head exists,
                defaults to max matryoshka dim. Otherwise returns full d_model.
            pool: pooling strategy — "last" (last token), "mean" (mean pool).
            use_projection: if True and matryoshka_head exists, use learned
                projection. If False, just truncate hidden states (zero-cost).
            language_ids: (batch, seq_len) or (batch,) language ids for
                multilingual embedding. Required if n_languages > 0.
            attention_mask: optional (batch, seq_len) mask for padding-aware
                mean pooling. 1 = real token, 0 = padding. Ignored for pool="last".

        Returns:
            (batch, dim) L2-normalized embedding.
        """
        was_training = self.training
        self.eval()
        try:
            # Forward pass (no cache, no loss)
            x = self.embedding(input_ids, language_ids=language_ids)
            for layer in self.layers:
                x, _, _ = layer(x)
            x = self.final_norm(x)

            # Pool: (batch, seq_len, d_model) → (batch, d_model)
            if pool == "last":
                x = x[:, -1, :]
            elif pool == "mean":
                if attention_mask is not None:
                    mask = attention_mask.to(dtype=x.dtype).unsqueeze(-1)  # (B, S, 1)
                    x = (x * mask).sum(dim=1) / mask.sum(dim=1).clamp_min(1.0)
                else:
                    x = x.mean(dim=1)
            else:
                raise ValueError(f"pool must be 'last' or 'mean', got {pool!r}")

            # Default dim from matryoshka head
            if dim is None and self.matryoshka_head is not None:
                dim = self.matryoshka_head.max_dim

            # Validate dim
            if dim is not None:
                if dim <= 0:
                    raise ValueError(f"dim must be > 0, got {dim}")
                if dim > x.shape[-1] and not (self.matryoshka_head is not None and use_projection):
                    raise ValueError(
                        f"dim ({dim}) cannot exceed hidden size ({x.shape[-1]}) "
                        f"without matryoshka projection"
                    )

            # Matryoshka encoding
            if self.matryoshka_head is not None and dim is not None:
                if use_projection:
                    result = self.matryoshka_head.encode(x, dim)
                else:
                    result = self.matryoshka_head.encode_truncate(x, dim)
            elif dim is not None:
                result = F.normalize(x[..., :dim], p=2, dim=-1)
            else:
                result = F.normalize(x, p=2, dim=-1)

            return result
        finally:
            if was_training:
                self.train()

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    def load_state_dict(self, state_dict, strict=True, **kwargs):
        migrated = self._migrate_state_dict(state_dict)
        # Graceful handling: if matryoshka_head exists in model but not in
        # checkpoint (old checkpoint), relax strict to avoid missing key errors.
        # The matryoshka projection will use fresh init (requires fine-tuning).
        has_matryoshka = self.matryoshka_head is not None
        ckpt_has_matryoshka = any(k.startswith("matryoshka_head.") for k in migrated)
        relaxed_for_matryoshka = False
        if has_matryoshka and not ckpt_has_matryoshka and strict:
            import logging
            logging.getLogger(__name__).warning(
                "Checkpoint missing matryoshka_head keys — loading with strict=False. "
                "Matryoshka projection will use fresh initialization (requires fine-tuning)."
            )
            strict = False
            relaxed_for_matryoshka = True
        try:
            result = super().load_state_dict(migrated, strict=strict, **kwargs)
        except TypeError:
            # Older PyTorch versions don't support extra kwargs (e.g., assign)
            result = super().load_state_dict(migrated, strict=strict)
        # If we relaxed strict only for matryoshka, verify no OTHER keys are bad
        if relaxed_for_matryoshka:
            bad_missing = [k for k in result.missing_keys if not k.startswith("matryoshka_head.")]
            bad_unexpected = [k for k in result.unexpected_keys if not k.startswith("matryoshka_head.")]
            if bad_missing or bad_unexpected:
                raise RuntimeError(
                    "Non-matryoshka state_dict mismatch detected while loading checkpoint. "
                    f"missing={bad_missing}, unexpected={bad_unexpected}"
                )
        self.post_load_init()
        return result

    def post_load_init(self) -> None:
        """Called after load_state_dict to fix up shared references."""
        self._reconnect_mtp_weights()

    def to(self, *args, **kwargs):
        """Override to re-bind MTP shared weights after device migration."""
        result = super().to(*args, **kwargs)
        self._reconnect_mtp_weights()
        return result

    def _reconnect_mtp_weights(self) -> None:
        """Re-bind MTP head projection owners after loading a checkpoint.

        When ``tie_embeddings=True`` the MTP heads read vocab projection
        weights through a weakref to ``self.embedding.token_emb``. This is not
        serialized in ``state_dict``, so after deserialization we must restore
        the owner reference.
        """
        if not self.config.tie_embeddings or len(self.mtp_heads) == 0:
            return
        import weakref

        shared_owner = self.embedding.token_emb
        for head in self.mtp_heads:
            if getattr(head, "_shared_proj_owner_ref", None) is not None:
                head._shared_proj_owner_ref = weakref.ref(shared_owner)

    def count_parameters(self, non_embedding: bool = False) -> int:
        """Count total (or non-embedding) trainable parameters."""
        total = sum(p.numel() for p in self.parameters())
        if non_embedding:
            emb_params = self.embedding.token_emb.weight.numel()
            if self.embedding.output_proj is not None:
                emb_params += self.embedding.output_proj.weight.numel()
            if self.embedding.emb_proj is not None:
                emb_params += self.embedding.emb_proj.weight.numel()
            if self.embedding.lang_emb is not None:
                emb_params += self.embedding.lang_emb.weight.numel()
            if self.embedding.emb_norm is not None:
                emb_params += self.embedding.emb_norm.weight.numel()
            return total - emb_params
        return total

    def __repr__(self) -> str:
        total = self.count_parameters()
        suffix = "M" if total < 1e9 else "B"
        count = total / 1e6 if total < 1e9 else total / 1e9
        return (
            f"{self.__class__.__name__}("
            f"name={self.config.name}, "
            f"params={count:.1f}{suffix}, "
            f"layers={self.config.n_layers}, "
            f"d_model={self.config.d_model}, "
            f"heads={self.config.n_heads})"
        )
