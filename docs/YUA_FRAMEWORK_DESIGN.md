# YUA Framework Architecture Design v1.0

> 2026-04-08 | YUA 독자 아키텍처 + 프레임워크 정합성 설계
> "남의 이름으로 돌아가는 모델"에서 "완전한 YUA 생태계"로 전환

---

## 0. 왜 이 문서가 필요한가

현재 YUA는:
- 학습: MaxText `decoder_block: "mixtral"` (남의 아키텍처 이름)
- 변환: 커스텀 스크립트로 MaxText → HF
- 추론: HuggingFace `MixtralForCausalLM` (남의 클래스)
- 서빙: 없음

**문제**: 커스텀 컴포넌트(Shared Expert, ReLU Routing, SERA, MTP) 추가 시 끼워넣을 곳이 없음.
**목표**: 모든 경로에서 `YuaForCausalLM`으로 통일. 학습→변환→추론→서빙 완전 자체 파이프라인.

---

## 1. 전체 아키텍처 다이어그램

```
                          YUA Ecosystem
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────┐ │
│  │  MaxText      │    │  HuggingFace  │    │  Serving     │ │
│  │  (Training)   │───▶│  (Hub/API)    │───▶│  (vLLM etc.) │ │
│  │              │◀───│               │    │              │ │
│  │ decoder_block│    │ YuaForCausalLM│    │ vllm-yua     │ │
│  │   : "yua"   │    │ (trust_remote) │    │ plugin       │ │
│  └──────┬───────┘    └───────┬───────┘    └──────┬───────┘ │
│         │                    │                    │         │
│  ┌──────┴────────────────────┴────────────────────┴──────┐  │
│  │            Bidirectional Weight Converter              │  │
│  │   MaxText Orbax ◀══════════════▶ HF SafeTensors       │  │
│  │              yua_weight_map.json                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Plugin Layer                        │  │
│  │  ┌────────┐ ┌───────────┐ ┌────────┐ ┌────────────┐  │  │
│  │  │ SERA   │ │ TurboQuant│ │ MTP    │ │ Tool Call  │  │  │
│  │  │ (TTA)  │ │ (KV 4bit) │ │ (Spec) │ │ API v3     │  │  │
│  │  └────────┘ └───────────┘ └────────┘ └────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Export Formats                        │  │
│  │  SafeTensors │ GGUF (llama.cpp) │ ONNX (optional)    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. YUA Decoder Layer 설계

### 2.1 차별점 (vs Mixtral / DeepSeek / Llama 4)

| 기능 | Mixtral | DeepSeek-V3 | Llama 4 | **YUA** |
|------|---------|-------------|---------|---------|
| Shared Expert | ✗ | ✓ (1개) | ✓ (1개) | **✓ (1개)** |
| Routing | TopK+Softmax | TopK+Bias | TopK+Softmax | **ReLU (aux-loss-free)** |
| Dense Layers | 없음 | 초반 3L | 교대 배치 | **초반 N개 dense** |
| QK-norm | ✗ | ✗ | ✗ | **✓** |
| MTP | ✗ | ✓ (2-head) | ✗ | **✓ (2-head)** |
| Expert 수 | 8 | 256 | 128 | **설정 가능 (8~64)** |

### 2.2 Layer 구조

```
YuaDecoderLayer (layer_idx < num_dense_layers):
  ├── input_layernorm (RMSNorm)
  ├── self_attn (GQA + RoPE + QK-norm)
  ├── residual connection
  ├── post_attention_layernorm (RMSNorm)
  ├── mlp (YuaSwiGLUMLP)  ← Dense FFN
  └── residual connection

YuaDecoderLayer (layer_idx >= num_dense_layers):
  ├── input_layernorm (RMSNorm)
  ├── self_attn (GQA + RoPE + QK-norm)
  ├── residual connection
  ├── post_attention_layernorm (RMSNorm)
  ├── shared_expert (YuaSwiGLUMLP)  ← 항상 활성
  ├── routed_moe (YuaSparseMoE)     ← ReLU routing, top-k
  ├── output = shared_out + routed_out
  └── residual connection
```

### 2.3 ReLU Routing (ReMoE, ICLR 2025)

```python
# 기존 (Mixtral/DeepSeek): TopK + Softmax
scores = softmax(gate(x))          # 전부 양수, 합=1
topk_weight, topk_idx = topk(scores, k)

# YUA: ReLU + Normalize (aux-loss-free)
scores = relu(gate(x))             # 음수 → 0 (자연스러운 sparsity)
topk_weight, topk_idx = topk(scores, k)
topk_weight = topk_weight / (topk_weight.sum(-1, keepdim=True) + eps)
```

**장점**: TopK의 불연속성 제거, gradient flow 개선, aux loss 불필요.
**출처**: ReMoE (arXiv:2412.14711, ICLR 2025), MIT 라이센스.

---

## 3. HuggingFace 통합

### 3.1 파일 구조 (Hub)

```
jungwon-ai/YUA-MoE-9.45B/
├── config.json                    ← model_type: "yua"
├── configuration_yua.py           ← YuaConfig
├── modeling_yua.py                ← YuaForCausalLM
├── generation_config.json
├── tokenizer.model                ← sentencepiece
├── tokenizer_config.json
├── special_tokens_map.json
├── model-00001-of-00004.safetensors
├── model-00002-of-00004.safetensors
├── model-00003-of-00004.safetensors
├── model-00004-of-00004.safetensors
└── model.safetensors.index.json
```

### 3.2 config.json

```json
{
  "model_type": "yua",
  "architectures": ["YuaForCausalLM"],
  "auto_map": {
    "AutoConfig": "configuration_yua.YuaConfig",
    "AutoModelForCausalLM": "modeling_yua.YuaForCausalLM"
  },
  "vocab_size": 128008,
  "hidden_size": 2048,
  "intermediate_size": 5461,
  "num_hidden_layers": 32,
  "num_attention_heads": 32,
  "num_key_value_heads": 8,
  "head_dim": 64,
  "max_position_embeddings": 4096,
  "rope_theta": 500000.0,
  "rms_norm_eps": 1e-5,
  "hidden_act": "silu",
  "tie_word_embeddings": false,
  "use_qk_norm": true,
  "num_dense_layers": 0,
  "num_experts_per_tok": 2,
  "num_local_experts": 8,
  "num_shared_experts": 0,
  "router_type": "topk",
  "torch_dtype": "bfloat16"
}
```

> **주의**: 현재 9.45B 모델은 shared expert/ReLU routing 없이 학습됨.
> `num_shared_experts: 0`, `router_type: "topk"`이 현재 값.
> Gen2부터 `num_shared_experts: 1`, `router_type: "relu"` 적용.

### 3.3 사용법

```python
from transformers import AutoModelForCausalLM, AutoConfig

# 로드 (trust_remote_code 필요)
model = AutoModelForCausalLM.from_pretrained(
    "jungwon-ai/YUA-MoE-9.45B",
    trust_remote_code=True,
    torch_dtype=torch.bfloat16,
    device_map="auto",
)

# 토크나이저
import sentencepiece as spm
sp = spm.SentencePieceProcessor("tokenizer.model")
```

---

## 4. MaxText 통합

### 4.1 decoder_block: "yua" 등록

수정 파일 5개:

| 파일 | 수정 내용 |
|------|----------|
| `common/common_types.py` | `YUA = "yua"` enum 추가 |
| `models/yua.py` | 신규: YuaDecoderLayer + Linen wrapper |
| `layers/decoders.py` | import + case 분기 + norm 튜플 |
| `configs/models/yua.yml` | 모델 config YAML |
| `utils/maxtext_utils.py` | FLOP 계산 (MoE 구조 반영) |

### 4.2 MaxText ↔ HF Weight 매핑

```
MaxText (JAX)                          HuggingFace (PyTorch)
─────────────────────────────────────────────────────────────
token_embedder.embedding            →  model.embed_tokens.weight
decoder.layers.self_attention       →  model.layers.{i}.self_attn
  .query.kernel[:, i, :, :]        →    .q_proj.weight  (reshape+T)
  .key.kernel[:, i, :, :]          →    .k_proj.weight  (reshape+T)
  .value.kernel[:, i, :, :]        →    .v_proj.weight  (reshape+T)
  .out.kernel[:, i, :, :]          →    .o_proj.weight  (reshape+T)
decoder.layers.shared_expert        →  model.layers.{i}.shared_expert
  .wi_0[:, i, :, :]               →    .gate_proj.weight  (T)
  .wi_1[:, i, :, :]               →    .up_proj.weight    (T)
  .wo[:, i, :, :]                  →    .down_proj.weight  (T)
decoder.layers.MoeBlock_0.gate      →  model.layers.{i}.router.gate
  .kernel[:, i, :]                 →    .weight  (T)
decoder.layers.MoeBlock_0           →  model.layers.{i}.experts.{e}
  .wi_0[e, i, :, :]               →    .gate_proj.weight  (T)
  .wi_1[e, i, :, :]               →    .up_proj.weight    (T)
  .wo[e, i, :, :]                  →    .down_proj.weight  (T)
decoder.layers.pre_self_attn_norm   →  model.layers.{i}.input_layernorm
  .scale[:, i]                     →    .weight
decoder.layers.post_self_attn_norm  →  model.layers.{i}.post_attention_layernorm
  .scale[:, i]                     →    .weight
decoder.decoder_norm.scale          →  model.norm.weight
decoder.logits_dense.kernel         →  lm_head.weight  (T)
```

---

## 5. 서빙 전략

### 5.1 Phase 1: vLLM trust_remote_code

```bash
vllm serve jungwon-ai/YUA-MoE-9.45B \
    --trust-remote-code \
    --dtype bfloat16 \
    --max-model-len 4096
```

### 5.2 Phase 2: vLLM 네이티브 플러그인

```
vllm-yua/
├── pyproject.toml
└── vllm_yua/
    ├── __init__.py    ← register()
    └── yua.py         ← FusedMoE + shared expert
```

### 5.3 GGUF (llama.cpp)

llama.cpp는 Mixtral MoE 지원. shared expert는 DeepSeek-V2 GGUF 패턴 참고.

---

## 6. 플러그인 통합

| 컴포넌트 | 학습 시 | 추론 시 | 서빙 시 |
|----------|--------|--------|--------|
| **SERA** | ✗ | HF 모델에 adapter attach | vLLM LoRA 호환 |
| **TurboQuant** | ✗ | ✗ | KV cache 4-bit 양자화 |
| **MTP** | config.mtp_enabled=True | 분리 (speculative decoding) | vLLM spec decode |
| **Tool Call** | SFT 데이터에 포함 | special token 생성 | 별도 처리 불필요 |

### MTP 분리 패턴

```python
# 학습: MTP head 포함
config.mtp_enabled = True
# → self.mtp_heads = nn.ModuleList([...])
# → loss += 0.1 * mtp_loss

# 추론: MTP head 제외
config.mtp_enabled = False
# → mtp_heads 미생성, checkpoint에서 해당 key 무시

# Speculative Decoding: MTP head를 draft model로 재활용
# vLLM --speculative-model [mtp-head-path]
```

---

## 7. Gen2 (d=10240) 확장 계획

현재 9.45B에서 검증 후, Gen2에서 본격 적용:

```yaml
# Gen2 config
decoder_block: "yua"
hidden_size: 10240           # 128 × 80
num_attention_heads: 80
num_key_value_heads: 16      # GQA 5:1
head_dim: 128                # MXU 128×128 정렬
intermediate_size: 27648     # 128 × 216
num_hidden_layers: 32
vocab_size: 128128           # 128 × 1001

# YUA 독자 설정
num_dense_layers: 3          # layer 0-2 dense
num_shared_experts: 1        # 항상 활성
num_local_experts: 32        # fine-grained
num_experts_per_tok: 4       # top-4
router_type: "relu"          # ReMoE
use_qk_norm: true
mtp_enabled: true
num_mtp_heads: 2
```

---

## 8. 파일 구조 (최종)

```
yua-llm/
├── src/
│   ├── model/
│   │   ├── configuration_yua.py   ← HF Config (신규)
│   │   ├── modeling_yua.py        ← HF Model (신규)
│   │   ├── yua_model.py           ← 기존 PyTorch 모델
│   │   ├── moe.py                 ← 기존 MoE
│   │   ├── mtp.py                 ← 기존 MTP
│   │   └── ...
│   └── ...
├── tools/
│   ├── convert_maxtext_moe_to_hf.py   ← 기존
│   ├── convert_maxtext_to_hf.py       ← 신규 (YUA 아키텍처용)
│   ├── convert_hf_to_maxtext.py       ← 신규 (역변환)
│   ├── convert_hf_to_gguf.py          ← 신규
│   ├── yua_weight_map.json            ← 신규
│   └── CONVERT_GUIDE.md               ← 기존
├── configs/
│   ├── model_gen2_4L.yaml             ← Gen2 PyTorch
│   └── ...
├── docs/
│   ├── YUA_FRAMEWORK_DESIGN.md        ← 이 문서
│   └── ...
└── vllm-yua/                          ← 별도 패키지 (나중에)
    └── ...
```

---

## 9. 구현 로드맵

### Phase 1: HF 모델 클래스 (지금)
- [ ] `configuration_yua.py` 작성
- [ ] `modeling_yua.py` 작성 (현재 9.45B 호환)
- [ ] 기존 변환 스크립트로 weight 로드 테스트
- [ ] Hub 업로드 + trust_remote_code 테스트

### Phase 2: MaxText decoder_block (CPT 끝난 후)
- [ ] MaxText에 `decoder_block: "yua"` 추가
- [ ] Shared Expert + ReLU Routing 구현
- [ ] 양방향 변환 스크립트 업데이트
- [ ] Gen2 학습 시작

### Phase 3: 서빙 (SFT 후)
- [ ] vLLM trust_remote_code 테스트
- [ ] vLLM 네이티브 플러그인
- [ ] GGUF 변환

### Phase 4: 플러그인 (Post-training 후)
- [ ] SERA HF 통합
- [ ] MTP speculative decoding
- [ ] TurboQuant KV cache

---

## 10. 참고 사례

| 모델 | HF 등록 방식 | vLLM 지원 | 교훈 |
|------|-------------|----------|------|
| DeepSeek-V3 | trust_remote_code | 네이티브 | shared expert 패턴 참고 |
| Qwen2-MoE | transformers PR | 네이티브 | 공식 등록 프로세스 참고 |
| Llama 4 | transformers PR | 네이티브 | interleaved MoE 참고 |
| Mixtral-8x7B | transformers 내장 | 네이티브 | 기본 MoE 구조 참고 |

---

## 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-04-08 | v1.0 | 초기 설계 |
