#!/usr/bin/env python3
"""Convert MaxText MoE (Mixtral) Orbax checkpoint to HuggingFace format.

Supports YUA MoE 9.45B (8E top-2, d=2048, 32L, GQA 4:1).
Runs on CPU. Does NOT require TPU.

Usage:
    JAX_PLATFORMS=cpu python3 scripts/convert_maxtext_moe_to_hf.py \
        --ckpt gs://yua-data-v1/maxtext_moe/yua_moe_real/checkpoints/14000/items/ \
        --output /tmp/yua_moe_hf \
        --dtype bf16

Weight mapping (MaxText → HF MixtralForCausalLM):
    token_embedder.embedding          → model.embed_tokens.weight
    query.kernel[:, i, :, :]          → layers.{i}.self_attn.q_proj.weight  (reshape+T)
    key.kernel[:, i, :, :]            → layers.{i}.self_attn.k_proj.weight  (reshape+T)
    value.kernel[:, i, :, :]          → layers.{i}.self_attn.v_proj.weight  (reshape+T)
    out.kernel[:, i, :, :]            → layers.{i}.self_attn.o_proj.weight  (reshape+T)
    MoeBlock_0.gate.kernel[:, i, :]   → layers.{i}.block_sparse_moe.gate.weight  (T)
    MoeBlock_0.wi_0[e, i, :, :]      → layers.{i}.block_sparse_moe.experts.{e}.w1.weight  (T)
    MoeBlock_0.wi_1[e, i, :, :]      → layers.{i}.block_sparse_moe.experts.{e}.w3.weight  (T)
    MoeBlock_0.wo[e, i, :, :]        → layers.{i}.block_sparse_moe.experts.{e}.w2.weight  (T)
    pre_self_attention_layer_norm     → layers.{i}.input_layernorm.weight
    post_self_attention_layer_norm    → layers.{i}.post_attention_layernorm.weight
    decoder_norm.scale                → model.norm.weight
    logits_dense.kernel               → lm_head.weight  (T)
"""

import argparse
import json
import os
import sys

os.environ["JAX_PLATFORMS"] = "cpu"
os.environ.setdefault("XLA_FLAGS", "--xla_force_host_platform_device_count=16")

import numpy as np
import torch
import jax
import jax.numpy as jnp
from flax.traverse_util import flatten_dict
import orbax.checkpoint as ocp


# === Model config ===
DEFAULT_CONFIG = {
    "d_model": 2048,
    "n_layers": 32,
    "n_heads": 32,
    "n_kv_heads": 8,
    "head_dim": 64,
    "ffn_dim": 5461,
    "num_experts": 8,
    "num_experts_per_tok": 2,
    "vocab_size": 128000,
    "rope_theta": 500000.0,
    "rms_norm_eps": 1e-5,
}


def load_maxtext_params(ckpt_path: str) -> dict:
    """Load MaxText Orbax checkpoint params, handling FSDP sharding."""
    print(f"Loading checkpoint: {ckpt_path}")

    checkpointer = ocp.PyTreeCheckpointer()
    restored = checkpointer.restore(ckpt_path)

    flat = flatten_dict(restored)
    # Extract only params (not opt_state)
    params = {}
    for k, v in flat.items():
        if k[0] == "params" and k[1] == "params":
            short_key = ".".join(k[2:])
            arr = np.array(jax.device_get(v), dtype=np.float32)
            params[short_key] = arr
            print(f"  {short_key}: {arr.shape}")

    return params


def convert(ckpt_path: str, output_path: str, cfg: dict, dtype_str: str = "bf16"):
    """Convert MaxText MoE checkpoint to HuggingFace format."""

    params = load_maxtext_params(ckpt_path)

    d = cfg["d_model"]
    L = cfg["n_layers"]
    H = cfg["n_heads"]
    KV = cfg["n_kv_heads"]
    HD = cfg["head_dim"]
    FFN = cfg["ffn_dim"]
    E = cfg["num_experts"]

    dtype = torch.bfloat16 if dtype_str == "bf16" else torch.float32

    def to_torch(arr):
        return torch.from_numpy(arr.copy()).to(dtype)

    hf = {}

    # === Embedding ===
    hf["model.embed_tokens.weight"] = to_torch(params["token_embedder.embedding"])
    print(f"\nembed_tokens: {hf['model.embed_tokens.weight'].shape}")

    # === Per-layer weights ===
    for i in range(L):
        prefix = f"model.layers.{i}"

        # --- Attention ---
        # Q: (d_model, layers, heads, head_dim) → slice layer → reshape → transpose
        q = params["decoder.layers.self_attention.query.kernel"][:, i, :, :]  # (d, H, HD)
        q = q.reshape(d, H * HD).T  # (H*HD, d) = (2048, 2048)
        hf[f"{prefix}.self_attn.q_proj.weight"] = to_torch(q)

        # K: (d_model, layers, kv_heads, head_dim)
        k = params["decoder.layers.self_attention.key.kernel"][:, i, :, :]
        k = k.reshape(d, KV * HD).T
        hf[f"{prefix}.self_attn.k_proj.weight"] = to_torch(k)

        # V
        v = params["decoder.layers.self_attention.value.kernel"][:, i, :, :]
        v = v.reshape(d, KV * HD).T
        hf[f"{prefix}.self_attn.v_proj.weight"] = to_torch(v)

        # O: (heads, layers, head_dim, d_model)
        o = params["decoder.layers.self_attention.out.kernel"][:, i, :, :]  # (H, HD, d)
        o = o.reshape(H * HD, d).T  # (d, H*HD)
        hf[f"{prefix}.self_attn.o_proj.weight"] = to_torch(o)

        # --- MoE Gate ---
        # (d_model, layers, num_experts)
        gate = params["decoder.layers.MoeBlock_0.gate.kernel"][:, i, :]  # (d, E)
        gate = gate.T  # (E, d)
        hf[f"{prefix}.block_sparse_moe.gate.weight"] = to_torch(gate)

        # --- MoE Experts ---
        for e in range(E):
            ep = f"{prefix}.block_sparse_moe.experts.{e}"

            # wi_0 (gate_proj / w1): (experts, layers, d_model, ffn)
            w1 = params["decoder.layers.MoeBlock_0.wi_0"][e, i, :, :]  # (d, FFN)
            hf[f"{ep}.w1.weight"] = to_torch(w1.T)  # (FFN, d)

            # wi_1 (up_proj / w3): same shape
            w3 = params["decoder.layers.MoeBlock_0.wi_1"][e, i, :, :]
            hf[f"{ep}.w3.weight"] = to_torch(w3.T)

            # wo (down_proj / w2): (experts, layers, ffn, d_model)
            w2 = params["decoder.layers.MoeBlock_0.wo"][e, i, :, :]  # (FFN, d)
            hf[f"{ep}.w2.weight"] = to_torch(w2.T)  # (d, FFN)

        # --- Norms ---
        pre_norm = params["decoder.layers.pre_self_attention_layer_norm.scale"][:, i]
        hf[f"{prefix}.input_layernorm.weight"] = to_torch(pre_norm)

        post_norm = params["decoder.layers.post_self_attention_layer_norm.scale"][:, i]
        hf[f"{prefix}.post_attention_layernorm.weight"] = to_torch(post_norm)

        if i == 0:
            print(f"  layer 0: q={q.shape}, k={k.shape}, gate={gate.shape}, w1={w1.shape}")

    # === Final norm ===
    hf["model.norm.weight"] = to_torch(params["decoder.decoder_norm.scale"])

    # === LM head ===
    lm_head = params["decoder.logits_dense.kernel"]  # (d, vocab)
    hf["lm_head.weight"] = to_torch(lm_head.T)  # (vocab, d)

    print(f"\nTotal HF keys: {len(hf)}")
    expected = 1 + L * (4 + 1 + E * 3 + 2) + 1 + 1  # embed + layers + norm + lm_head
    print(f"Expected: {expected}")

    # === Save ===
    os.makedirs(output_path, exist_ok=True)

    # Save weights
    torch.save(hf, os.path.join(output_path, "pytorch_model.bin"))
    print(f"Saved weights: {os.path.join(output_path, 'pytorch_model.bin')}")

    # Save config.json (HF MixtralConfig)
    hf_config = {
        "architectures": ["MixtralForCausalLM"],
        "model_type": "mixtral",
        "hidden_size": d,
        "intermediate_size": FFN,
        "num_hidden_layers": L,
        "num_attention_heads": H,
        "num_key_value_heads": KV,
        "head_dim": HD,
        "hidden_act": "silu",
        "max_position_embeddings": 2048,
        "rms_norm_eps": cfg["rms_norm_eps"],
        "vocab_size": cfg["vocab_size"],
        "num_local_experts": E,
        "num_experts_per_tok": cfg["num_experts_per_tok"],
        "rope_theta": cfg["rope_theta"],
        "tie_word_embeddings": False,
        "torch_dtype": "bfloat16",
        "router_aux_loss_coef": 0.01,
        "sliding_window": None,
    }
    with open(os.path.join(output_path, "config.json"), "w") as f:
        json.dump(hf_config, f, indent=2)
    print(f"Saved config.json")

    # Save tokenizer config (placeholder — real tokenizer needs separate setup)
    tok_config = {
        "model_type": "mixtral",
        "tokenizer_class": "LlamaTokenizer",
        "sp_model_path": "yua_128k_v2.model",
    }
    with open(os.path.join(output_path, "tokenizer_config.json"), "w") as f:
        json.dump(tok_config, f, indent=2)

    size_gb = os.path.getsize(os.path.join(output_path, "pytorch_model.bin")) / 1e9
    print(f"\nDone! Output: {output_path} ({size_gb:.2f} GB)")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Convert MaxText MoE to HuggingFace")
    p.add_argument("--ckpt", required=True, help="Orbax checkpoint path (local or gs://)")
    p.add_argument("--output", required=True, help="HF output directory")
    p.add_argument("--dtype", default="bf16", choices=["bf16", "fp32"])
    p.add_argument("--d-model", type=int, default=2048)
    p.add_argument("--n-layers", type=int, default=32)
    p.add_argument("--n-heads", type=int, default=32)
    p.add_argument("--n-kv-heads", type=int, default=8)
    p.add_argument("--head-dim", type=int, default=64)
    p.add_argument("--ffn-dim", type=int, default=5461)
    p.add_argument("--num-experts", type=int, default=8)
    p.add_argument("--vocab-size", type=int, default=128000)
    args = p.parse_args()

    cfg = DEFAULT_CONFIG.copy()
    cfg.update({
        "d_model": args.d_model,
        "n_layers": args.n_layers,
        "n_heads": args.n_heads,
        "n_kv_heads": args.n_kv_heads,
        "head_dim": args.head_dim,
        "ffn_dim": args.ffn_dim,
        "num_experts": args.num_experts,
        "vocab_size": args.vocab_size,
    })

    convert(args.ckpt, args.output, cfg, args.dtype)
