# MaxText MoE → HuggingFace 변환 가이드

## 개요

MaxText (Orbax) 체크포인트를 HuggingFace `MixtralForCausalLM` 포맷으로 변환.
CPU에서 실행 가능 — 학습 중에도 변환 가능.

## 지원 모델

| 항목 | 값 |
|------|---|
| 아키텍처 | MoE 8E top-2 (Mixtral) |
| d_model | 2048 |
| layers | 32 |
| heads / kv_heads | 32 / 8 (GQA 4:1) |
| head_dim | 64 |
| ffn_dim | 5461 |
| vocab_size | 128000 |
| params | 9.45B total |
| 출력 크기 | ~18.9GB (bf16) |

## 사용법

### 기본 (GCS 체크포인트)

```bash
JAX_PLATFORMS=cpu python3 scripts/convert_maxtext_moe_to_hf.py \
    --ckpt gs://yua-data-v1/maxtext_moe/yua_moe_real/checkpoints/14000/items/ \
    --output /tmp/yua_moe_hf \
    --dtype bf16
```

### 로컬 체크포인트

```bash
JAX_PLATFORMS=cpu python3 scripts/convert_maxtext_moe_to_hf.py \
    --ckpt /mnt/data/checkpoints/latest/items/ \
    --output /tmp/yua_moe_hf
```

### 커스텀 설정 (다른 모델 크기)

```bash
JAX_PLATFORMS=cpu python3 scripts/convert_maxtext_moe_to_hf.py \
    --ckpt /path/to/checkpoint/items/ \
    --output /path/to/output \
    --d-model 2048 \
    --n-layers 32 \
    --n-heads 32 \
    --n-kv-heads 8 \
    --ffn-dim 5461 \
    --num-experts 8 \
    --vocab-size 128000
```

## 변환 후 사용

### 텍스트 생성

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

model = AutoModelForCausalLM.from_pretrained(
    "/tmp/yua_moe_hf",
    torch_dtype=torch.bfloat16,
    device_map="auto"
)

# 토크나이저 (sentencepiece)
from sentencepiece import SentencePieceProcessor
sp = SentencePieceProcessor("yua_128k_v2.model")

text = "한국의 수도는"
ids = sp.encode(text)
input_ids = torch.tensor([ids], device=model.device)

with torch.no_grad():
    out = model.generate(input_ids, max_new_tokens=50, do_sample=True, temperature=0.7)

print(sp.decode(out[0].tolist()))
```

### HuggingFace Hub 업로드

```python
from huggingface_hub import HfApi

api = HfApi()
api.upload_folder(
    folder_path="/tmp/yua_moe_hf",
    repo_id="jungwon-ai/YUA-MoE-9.45B",
    repo_type="model"
)
```

## Weight 매핑

| MaxText key | HuggingFace key | 변환 |
|---|---|---|
| `token_embedder.embedding` | `model.embed_tokens.weight` | 그대로 |
| `query.kernel[:, i, :, :]` | `layers.{i}.self_attn.q_proj.weight` | reshape + T |
| `key.kernel[:, i, :, :]` | `layers.{i}.self_attn.k_proj.weight` | reshape + T |
| `value.kernel[:, i, :, :]` | `layers.{i}.self_attn.v_proj.weight` | reshape + T |
| `out.kernel[:, i, :, :]` | `layers.{i}.self_attn.o_proj.weight` | reshape + T |
| `MoeBlock_0.gate.kernel[:, i, :]` | `layers.{i}.block_sparse_moe.gate.weight` | T |
| `MoeBlock_0.wi_0[e, i, :, :]` | `experts.{e}.w1.weight` (gate_proj) | T |
| `MoeBlock_0.wi_1[e, i, :, :]` | `experts.{e}.w3.weight` (up_proj) | T |
| `MoeBlock_0.wo[e, i, :, :]` | `experts.{e}.w2.weight` (down_proj) | T |
| `pre_self_attention_layer_norm.scale` | `input_layernorm.weight` | slice layer |
| `post_self_attention_layer_norm.scale` | `post_attention_layernorm.weight` | slice layer |
| `decoder_norm.scale` | `model.norm.weight` | 그대로 |
| `logits_dense.kernel` | `lm_head.weight` | T |

## 의존성

```
pip install jax jaxlib flax orbax-checkpoint torch numpy
```

## 검증

변환 후 key 수: **995개** (= 1 embed + 32 layers × (4 attn + 1 gate + 24 expert + 2 norm) + 1 final_norm + 1 lm_head)

```bash
python3 -c "
import torch
w = torch.load('/tmp/yua_moe_hf/pytorch_model.bin', map_location='cpu')
print(f'Keys: {len(w)}')
for k in sorted(w.keys())[:10]:
    print(f'  {k}: {w[k].shape}')
"
```
