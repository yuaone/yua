---
license: apache-2.0
language:
  - ko
  - en
  - ja
  - zh
tags:
  - mixture-of-experts
  - moe
  - multilingual
  - text-generation
  - from-scratch
library_name: transformers
pipeline_tag: text-generation
---

# YUA 1.0 MoE 9.45B

**YUA 1.0 MoE** is a multilingual Mixture-of-Experts language model with **9.45B total parameters** and **2.7B active parameters per token**. It was trained entirely from scratch on Korean, English, Japanese, and Chinese data using MaxText (JAX) on Google Cloud TPU v4-32.

> Apache 2.0 licensed. $0 compute cost (Google TRC program). Built by a solo developer.

## Model Summary

| | |
|---|---|
| **Developer** | Jungwon Eom |
| **Model type** | Decoder-only MoE Transformer |
| **Total parameters** | 9.45B |
| **Active parameters** | 2.7B (per token) |
| **Experts** | 8 experts, top-2 routing |
| **Languages** | Korean, English, Japanese, Chinese + 12 more (see below) |
| **License** | Apache 2.0 |
| **Training framework** | MaxText (JAX) on TPU v4-32 |
| **Compute cost** | $0 (Google TRC grant) |

## Architecture

| Component | Specification |
|---|---|
| Type | Decoder-only autoregressive Transformer (MoE) |
| Layers | 32 |
| Hidden dim (`d_model`) | 2,048 |
| Attention heads (Q) | 32 |
| KV heads (GQA) | 8 |
| Head dimension | 64 |
| FFN dim per expert | 5,461 (SwiGLU) |
| Number of experts | 8 |
| Top-K routing | 2 |
| Vocabulary | 128,000 (SentencePiece BPE) |
| Max context length | 2,048 (→ 256K via YaRN post-training) |
| Position encoding | RoPE (theta=500,000) |
| Normalization | Pre-LN with RMSNorm |
| QK-Norm | Yes |
| Attention | Flash Attention 2 |
| Initialization | Random (from scratch, no pretrained weights) |

### Design Choices

- **SwiGLU activation** per Shazeer (2020) for improved FFN quality
- **Grouped-Query Attention (GQA)** with 8 KV heads for memory-efficient inference
- **QK-Norm** following Qwen 3 / Gemma 3 for training stability at scale
- **RoPE with theta=500K** for extended positional generalization
- **Top-2 expert routing** balancing compute efficiency and model capacity

## Intended Uses

- **Multilingual text generation** (Korean, English, Japanese, Chinese)
- **Research** on MoE architectures and multilingual transfer
- **Base model for fine-tuning** on downstream tasks (chat, instruction following, summarization, etc.)
- **Educational purposes** -- fully open training methodology

### Out-of-Scope Uses

- Safety-critical applications without additional alignment
- Production deployment without evaluation on your specific task
- Single-language tasks where a dedicated monolingual model may perform better

## How to Load

### Transformers (Recommended)

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

model_name = "jungwon-ai/YUA-1.0-MoE-9.45B"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.bfloat16,
    device_map="auto",
)

prompt = "The future of artificial intelligence is"
inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
outputs = model.generate(**inputs, max_new_tokens=256, do_sample=True, temperature=0.7)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
```

### Transformers with 4-bit Quantization (Low VRAM)

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
)

model = AutoModelForCausalLM.from_pretrained(
    "jungwon-ai/YUA-1.0-MoE-9.45B",
    quantization_config=quantization_config,
    device_map="auto",
)
```

This reduces VRAM usage to approximately **6-8 GB**, making it runnable on consumer GPUs like RTX 3060/4060.

### vLLM (High-Throughput Serving)

```bash
pip install vllm

# Single GPU serving
vllm serve jungwon-ai/YUA-1.0-MoE-9.45B \
    --dtype bfloat16 \
    --max-model-len 2048

# Multi-GPU with expert parallelism
vllm serve jungwon-ai/YUA-1.0-MoE-9.45B \
    --dtype bfloat16 \
    --tensor-parallel-size 2 \
    --enable-expert-parallel \
    --max-model-len 2048
```

Python API:

```python
from vllm import LLM, SamplingParams

llm = LLM(model="jungwon-ai/YUA-1.0-MoE-9.45B", dtype="bfloat16")
params = SamplingParams(temperature=0.7, max_tokens=256)
outputs = llm.generate(["The future of AI is"], params)
print(outputs[0].outputs[0].text)
```

### llama.cpp (CPU / Edge Inference)

```bash
# Convert to GGUF
python convert_hf_to_gguf.py /path/to/YUA-1.0-MoE-9.45B --outfile yua-moe-9.2b-f16.gguf

# Quantize to Q4_K_M (recommended balance of quality/size)
./llama-quantize yua-moe-9.2b-f16.gguf yua-moe-9.2b-q4_k_m.gguf Q4_K_M

# Run inference
./llama-cli -m yua-moe-9.2b-q4_k_m.gguf -p "The future of AI is" -n 256
```

### Ollama

```bash
# From GGUF file
ollama create yua-moe -f Modelfile

# Modelfile contents:
# FROM ./yua-moe-9.2b-q4_k_m.gguf
# PARAMETER temperature 0.7
# PARAMETER num_ctx 2048
# SYSTEM "You are YUA, a helpful multilingual assistant."

ollama run yua-moe "인공지능의 미래는"
```

### VRAM Requirements

| Method | VRAM | Notes |
|---|---|---|
| BF16 (full) | ~19 GB | Active params only loaded per token |
| 8-bit (int8) | ~10 GB | bitsandbytes load_in_8bit |
| 4-bit (NF4) | ~6 GB | QLoRA-compatible quantization |
| GGUF Q4_K_M | ~5 GB | CPU or GPU offload via llama.cpp |
| vLLM BF16 | ~19 GB | + KV cache overhead |

## How to Fine-Tune

See the full [Fine-Tuning Guide](FINE_TUNING_GUIDE.md) for detailed instructions.

### Quick LoRA Example

```python
from peft import LoraConfig, get_peft_model, TaskType

lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    modules_to_save=["gate"],  # Keep router trainable
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# trainable params: ~27M (0.29% of 9.45B)
```

### Fine-Tuning Approaches

| Method | VRAM Required | Recommended For |
|---|---|---|
| QLoRA (4-bit) | 8-12 GB | Consumer GPUs (RTX 3090/4090) |
| LoRA (BF16) | 20-24 GB | A100/H100 single GPU |
| Full SFT | 64+ GB | Multi-GPU or TPU |
| Full SFT (TPU) | TPU v4-8+ | Maximum quality |

## Training Details

### Infrastructure

| | |
|---|---|
| Hardware | Google Cloud TPU v4-32 (16 chips, 4 workers) |
| Framework | MaxText (JAX) |
| Zone | us-central2-b |
| Compute cost | **$0** (Google TRC program) |
| Training precision | BF16 |

### Training Configuration

| | |
|---|---|
| Batch size per device | 8 |
| Sequence length | 2,048 |
| Attention | Flash Attention |
| Remat policy | Full |
| Step speed | ~2.1 s/step |
| Tokens per step | 262K |
| Throughput | ~125K tokens/sec |
| Checkpoint interval | 500 steps |

### Training Data

| Language | Sources | Approx. Ratio |
|---|---|---|
| Korean | FineWeb2-ko, Wikipedia-ko, KoAlpaca, Korean Law, Historical Corpus | ~25% |
| English | FineWeb 350BT, Wikipedia-en, ArXiv, peS2o, PG19 | ~30% |
| Japanese | FineWeb2-ja, Wikipedia-ja, Japan Law | ~15% |
| Chinese | FineWeb2-zh, SkyPile, Wikipedia-zh | ~15% |
| Code | The Stack (43 languages), OpenCode | ~10% |
| Other 12 languages | FineWeb2: Arabic, Bengali, German, French, Hindi, Indonesian, Italian, Polish, Portuguese, Spanish, Thai, Vietnamese | ~5% |

**Total training data: ~1.4TB raw, ~804GB tokenized shards.**
All data sourced from publicly available datasets. No proprietary or restricted data used.

### Training Scale

- **Target**: ~518B tokens over full training run
- **Chinchilla optimal** for 2.7B active params: ~54B tokens
- **Over-training ratio**: ~9.6x Chinchilla optimal (following Llama scaling philosophy)

## Originality Statement

**YUA 1.0 MoE is designed, implemented, and trained from scratch.**

- All parameters initialized randomly -- no pretrained weights transferred
- No HyperCloning -- avoided symmetry bug discovered in Dense 7B experiments
- Architecture combines standard techniques from published research (see references below)
- Full development history tracked in Git from first commit
- Multiple rounds of code review and architecture validation

### Reference Papers

| Technique | Paper | Usage |
|---|---|---|
| MoE | Shazeer et al., 2017 | Sparse expert routing |
| Top-2 Gating | Lepikhin et al., 2021 (GShard) | Expert selection |
| RoPE | Su et al., 2021 (RoFormer) | Positional encoding |
| SwiGLU | Shazeer, 2020 | FFN activation |
| GQA | Ainslie et al., 2023 | KV head efficiency |
| QK-Norm | Dehghani et al., 2023 | Training stability |
| RMSNorm | Zhang & Sennrich, 2019 | Pre-LN normalization |

## Environmental Impact

| | |
|---|---|
| Hardware | TPU v4-32 (Google Cloud) |
| Compute cost | **$0** |
| Funding | Google TRC (TPU Research Cloud) grant |
| Training region | us-central2-b (Iowa, USA) |
| Carbon offset | Google Cloud matches 100% renewable energy |

This model was trained at zero monetary cost through the Google TPU Research Cloud program, which provides free TPU access for open research. The training infrastructure runs in Google's Iowa data center, which operates on carbon-neutral energy.

## Evaluation

Benchmark evaluation is planned after completion of continual pretraining and supervised fine-tuning. Results will be updated here.

Planned benchmarks:
- MMLU / MMLU-Pro (multilingual)
- HumanEval / MBPP (code)
- GSM8K / MATH (reasoning)
- KoBEST (Korean NLU)
- JGLUE (Japanese NLU)
- C-Eval (Chinese)
- MT-Bench (conversation quality)

## Roadmap

| Phase | Target | Status |
|---|---|---|
| Pretraining (9.45B MoE) | 518B tokens on TPU v4-32 | In progress |
| Context Extension | 2K → 256K via YaRN | Planned (post EP1) |
| SFT | Instruction tuning with tool calling | Planned |
| DPO | Preference alignment | Planned |
| HuggingFace Release | Public model weights | After SFT |
| 26B Hybrid MoE | Mamba-2 + Transformer + MoE | Design complete |

## Limitations

- **Training in progress** -- model is in the continual pretraining phase
- **Multilingual capacity dilution** -- each language may underperform a dedicated monolingual model of equivalent active size
- **Base context: 2,048 tokens** -- 256K extension planned via YaRN post-training
- **No alignment training yet** -- base model only, may produce harmful or inaccurate outputs
- **MoE routing** -- expert load balancing is being continuously optimized

## Tokenizer

| | |
|---|---|
| Type | SentencePiece BPE |
| Normalization | NFKC |
| Model file | `yua_128k_v2.model` |
| Vocabulary size | 128,000 |
| Byte fallback | Yes |
| Character coverage | 0.9995 |
| Languages | Korean, English, Japanese, Chinese + byte fallback for all scripts |

## License

This model is released under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). You are free to use, modify, and distribute it for any purpose, including commercial use.

## Citation

```bibtex
@misc{yua2026moe,
  title   = {YUA 1.0: Multilingual Mixture-of-Experts Language Model (9.45B/2.7B)},
  author  = {Jungwon Eom},
  year    = {2026},
  url     = {https://huggingface.co/jungwon-ai/YUA-1.0-MoE-9.45B},
  note    = {9.45B total / 2.7B active MoE. Trained from scratch on TPU v4-32. Apache 2.0.}
}
```

## Contact

- **Developer**: Jungwon Eom
- **HuggingFace**: [jungwon-ai](https://huggingface.co/jungwon-ai)

## Acknowledgments

- Google TPU Research Cloud (TRC) for providing compute resources at zero cost
- The open-source community for foundational research papers and tools
- HuggingFace, JAX/MaxText, and vLLM teams for the inference and training ecosystem
