# YUA 1.0 MoE 9.2B -- Fine-Tuning Guide

This guide covers practical fine-tuning methods for the YUA 1.0 MoE model (9.2B total / 2.7B active parameters). It includes LoRA, QLoRA, and full SFT approaches with tested configurations and example scripts.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Dataset Format (ChatML)](#dataset-format-chatml)
3. [LoRA Fine-Tuning](#lora-fine-tuning)
4. [QLoRA for Consumer GPUs (24GB)](#qlora-for-consumer-gpus-24gb)
5. [Full SFT on TPU](#full-sft-on-tpu)
6. [Recommended Hyperparameters](#recommended-hyperparameters)
7. [MoE-Specific Considerations](#moe-specific-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

```bash
pip install torch>=2.1.0
pip install transformers>=4.40.0
pip install peft>=0.10.0
pip install trl>=0.8.0
pip install datasets
pip install bitsandbytes>=0.43.0    # for QLoRA
pip install flash-attn>=2.5.0       # optional, for Flash Attention 2
pip install wandb                    # optional, for logging
```

---

## Dataset Format (ChatML)

YUA uses the ChatML template for instruction tuning. Prepare your data as JSONL with the following structure:

### Single-Turn

```json
{"messages": [{"role": "system", "content": "You are YUA, a helpful assistant."}, {"role": "user", "content": "What is mixture of experts?"}, {"role": "assistant", "content": "Mixture of Experts (MoE) is an architecture where..."}]}
```

### Multi-Turn

```json
{"messages": [{"role": "system", "content": "You are YUA, a helpful assistant."}, {"role": "user", "content": "Explain LoRA in one sentence."}, {"role": "assistant", "content": "LoRA adds small trainable low-rank matrices to frozen model weights."}, {"role": "user", "content": "How does it save memory?"}, {"role": "assistant", "content": "Instead of updating all parameters, LoRA only trains two small matrices per layer, reducing trainable parameters by 99%+."}]}
```

### ChatML Token Format

The tokenizer applies ChatML formatting automatically when using `apply_chat_template`:

```
<|im_start|>system
You are YUA, a helpful assistant.<|im_end|>
<|im_start|>user
What is MoE?<|im_end|>
<|im_start|>assistant
Mixture of Experts is...<|im_end|>
```

### Loading Datasets

```python
from datasets import load_dataset

# From local JSONL
dataset = load_dataset("json", data_files="train.jsonl", split="train")

# From HuggingFace Hub
dataset = load_dataset("your-username/your-dataset", split="train")
```

---

## LoRA Fine-Tuning

**Requirements**: 20-24 GB VRAM (A100 40GB, RTX 4090, etc.)

### Target Modules for MoE

For MoE models, it is critical to apply LoRA to both attention layers and expert FFN layers. The router (`gate`) should remain fully trainable (not LoRA-adapted) to allow proper expert rebalancing during fine-tuning.

```python
target_modules = [
    # Attention
    "q_proj", "k_proj", "v_proj", "o_proj",
    # Expert FFN (SwiGLU -- applied to ALL experts)
    "gate_proj", "up_proj", "down_proj",
]
```

### Full LoRA Training Script

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import LoraConfig, get_peft_model, TaskType
from trl import SFTTrainer
from datasets import load_dataset

# ── Model & Tokenizer ──────────────────────────────────────────────
model_name = "jungwon-ai/YUA-1.0-MoE-9.2B"

tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.bfloat16,
    device_map="auto",
    attn_implementation="flash_attention_2",  # optional
)
model.config.use_cache = False  # required for gradient checkpointing

# ── LoRA Configuration ─────────────────────────────────────────────
lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    modules_to_save=["gate"],  # MoE router stays fully trainable
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# Expected: trainable params ~27M (0.29% of 9.2B)

# ── Dataset ─────────────────────────────────────────────────────────
dataset = load_dataset("json", data_files="train.jsonl", split="train")

def format_chat(example):
    return {"text": tokenizer.apply_chat_template(
        example["messages"], tokenize=False, add_generation_prompt=False
    )}

dataset = dataset.map(format_chat)

# ── Training Arguments ──────────────────────────────────────────────
training_args = TrainingArguments(
    output_dir="./yua-moe-lora",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    warmup_ratio=0.05,
    bf16=True,
    logging_steps=10,
    save_strategy="steps",
    save_steps=200,
    save_total_limit=3,
    gradient_checkpointing=True,
    gradient_checkpointing_kwargs={"use_reentrant": False},
    optim="adamw_torch",
    max_grad_norm=1.0,
    report_to="wandb",  # or "none"
    dataloader_num_workers=4,
)

# ── Trainer ─────────────────────────────────────────────────────────
trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    tokenizer=tokenizer,
    max_seq_length=2048,
    dataset_text_field="text",
    packing=True,  # pack short examples for efficiency
)

trainer.train()

# ── Save ────────────────────────────────────────────────────────────
trainer.save_model("./yua-moe-lora/final")
tokenizer.save_pretrained("./yua-moe-lora/final")
```

### Merging LoRA Weights

After training, merge LoRA adapters back into the base model for deployment:

```python
from peft import PeftModel

base_model = AutoModelForCausalLM.from_pretrained(
    "jungwon-ai/YUA-1.0-MoE-9.2B",
    torch_dtype=torch.bfloat16,
    device_map="auto",
)
model = PeftModel.from_pretrained(base_model, "./yua-moe-lora/final")
merged_model = model.merge_and_unload()

merged_model.save_pretrained("./yua-moe-merged")
tokenizer.save_pretrained("./yua-moe-merged")
```

---

## QLoRA for Consumer GPUs (24GB)

**Requirements**: 8-12 GB VRAM (RTX 3090, RTX 4090, RTX 4060 Ti 16GB)

QLoRA quantizes the base model to 4-bit NormalFloat and trains LoRA adapters in BF16. This is the most accessible way to fine-tune YUA on consumer hardware.

### QLoRA Training Script

```python
import torch
from transformers import (
    AutoModelForCausalLM, AutoTokenizer,
    TrainingArguments, BitsAndBytesConfig,
)
from peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training
from trl import SFTTrainer
from datasets import load_dataset

# ── 4-bit Quantization Config ──────────────────────────────────────
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,  # nested quantization saves ~0.4 GB
)

# ── Model & Tokenizer ──────────────────────────────────────────────
model_name = "jungwon-ai/YUA-1.0-MoE-9.2B"

tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    device_map="auto",
)
model = prepare_model_for_kbit_training(model)
model.config.use_cache = False

# ── LoRA Configuration ─────────────────────────────────────────────
lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=32,                # higher rank for QLoRA to compensate quantization noise
    lora_alpha=64,
    lora_dropout=0.05,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    modules_to_save=["gate"],
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# ── Dataset ─────────────────────────────────────────────────────────
dataset = load_dataset("json", data_files="train.jsonl", split="train")

def format_chat(example):
    return {"text": tokenizer.apply_chat_template(
        example["messages"], tokenize=False, add_generation_prompt=False
    )}

dataset = dataset.map(format_chat)

# ── Training Arguments (optimized for 24GB VRAM) ───────────────────
training_args = TrainingArguments(
    output_dir="./yua-moe-qlora",
    num_train_epochs=3,
    per_device_train_batch_size=2,       # small batch for low VRAM
    gradient_accumulation_steps=8,       # effective batch = 16
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    warmup_ratio=0.05,
    bf16=True,
    logging_steps=10,
    save_strategy="steps",
    save_steps=200,
    save_total_limit=3,
    gradient_checkpointing=True,
    gradient_checkpointing_kwargs={"use_reentrant": False},
    optim="paged_adamw_8bit",            # 8-bit paged optimizer saves ~2GB
    max_grad_norm=1.0,
    report_to="wandb",
    dataloader_num_workers=2,
    max_steps=-1,
)

# ── Trainer ─────────────────────────────────────────────────────────
trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    tokenizer=tokenizer,
    max_seq_length=2048,
    dataset_text_field="text",
    packing=True,
)

trainer.train()
trainer.save_model("./yua-moe-qlora/final")
tokenizer.save_pretrained("./yua-moe-qlora/final")
```

### VRAM Usage Breakdown (QLoRA, seq_len=2048)

| Component | Estimated VRAM |
|---|---|
| 4-bit base model | ~5.5 GB |
| LoRA adapters (BF16) | ~0.2 GB |
| Optimizer states (8-bit paged) | ~0.4 GB |
| Activations + gradients | ~3-5 GB |
| KV cache disabled (training) | 0 |
| **Total (batch_size=2)** | **~9-11 GB** |

---

## Full SFT on TPU

For maximum fine-tuning quality, full supervised fine-tuning updates all 9.2B parameters. This requires TPU v4-8 or larger (or equivalent multi-GPU setups).

### TPU Full SFT with MaxText (JAX)

If you have access to TPU via Google TRC or GCP, the most efficient path is continuing with the same MaxText framework used for pretraining:

```bash
# On TPU v4-8 or v4-32
python3 MaxText/train.py MaxText/configs/base.yml \
    run_name=yua-moe-sft \
    model_name=yua_moe_9b \
    base_output_directory=gs://your-bucket/sft-checkpoints \
    dataset_path=gs://your-bucket/sft-data/ \
    load_parameters_path=gs://your-bucket/pretrain-checkpoint/latest \
    per_device_batch_size=4 \
    max_target_length=2048 \
    learning_rate=5e-6 \
    warmup_steps=100 \
    steps=5000 \
    enable_checkpointing=true \
    checkpoint_period=500
```

### Full SFT with PyTorch + FSDP (Multi-GPU)

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from trl import SFTTrainer
from datasets import load_dataset

model_name = "jungwon-ai/YUA-1.0-MoE-9.2B"

tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.bfloat16,
    # No device_map for FSDP -- accelerate handles sharding
)

dataset = load_dataset("json", data_files="train.jsonl", split="train")

def format_chat(example):
    return {"text": tokenizer.apply_chat_template(
        example["messages"], tokenize=False, add_generation_prompt=False
    )}

dataset = dataset.map(format_chat)

training_args = TrainingArguments(
    output_dir="./yua-moe-full-sft",
    num_train_epochs=2,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=16,
    learning_rate=5e-6,              # lower LR for full SFT
    lr_scheduler_type="cosine",
    warmup_ratio=0.03,
    bf16=True,
    logging_steps=5,
    save_strategy="steps",
    save_steps=500,
    save_total_limit=3,
    gradient_checkpointing=True,
    gradient_checkpointing_kwargs={"use_reentrant": False},
    optim="adamw_torch",
    max_grad_norm=1.0,
    fsdp="full_shard auto_wrap",
    fsdp_config={
        "transformer_layer_cls_to_wrap": ["YuaMoEDecoderLayer"],
    },
    report_to="wandb",
)

trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    tokenizer=tokenizer,
    max_seq_length=2048,
    dataset_text_field="text",
    packing=True,
)

trainer.train()
trainer.save_model("./yua-moe-full-sft/final")
```

Launch with accelerate:

```bash
accelerate launch --config_file fsdp_config.yaml train_full_sft.py
```

---

## Recommended Hyperparameters

### LoRA / QLoRA

| Parameter | LoRA (BF16) | QLoRA (4-bit) | Notes |
|---|---|---|---|
| `r` (rank) | 16 | 32 | Higher rank for QLoRA to offset quantization noise |
| `lora_alpha` | 32 | 64 | Typical ratio: alpha = 2 * r |
| `lora_dropout` | 0.05 | 0.05 | Regularization |
| Learning rate | 2e-4 | 2e-4 | Standard for LoRA SFT |
| LR scheduler | cosine | cosine | |
| Warmup ratio | 0.05 | 0.05 | |
| Batch size (effective) | 16 | 16 | Adjust grad_accum accordingly |
| Epochs | 2-3 | 2-3 | Monitor for overfitting |
| Max grad norm | 1.0 | 1.0 | |
| Weight decay | 0.01 | 0.01 | |
| Optimizer | AdamW | paged_adamw_8bit | 8-bit saves VRAM |
| Sequence length | 2048 | 2048 | Model max context |

### Full SFT

| Parameter | Value | Notes |
|---|---|---|
| Learning rate | 5e-6 | 10-40x lower than LoRA |
| LR scheduler | cosine | |
| Warmup ratio | 0.03 | |
| Batch size (effective) | 32-64 | Larger batches stabilize MoE training |
| Epochs | 1-2 | Full SFT overfits faster |
| Max grad norm | 1.0 | |
| Weight decay | 0.1 | Stronger regularization |
| Optimizer | AdamW | |

### MoE Router

| Parameter | Value | Notes |
|---|---|---|
| Router LR | Same as base | Keep `modules_to_save=["gate"]` in LoRA |
| Load balancing loss weight | 0.01 | Prevents expert collapse during fine-tuning |
| Router z-loss | 0.001 | Optional stability term |

---

## MoE-Specific Considerations

### 1. Keep the Router Trainable

The expert router (`gate` module) should always be fully trainable during fine-tuning, not LoRA-adapted. This allows the routing distribution to adapt to the new task's data distribution.

```python
lora_config = LoraConfig(
    ...
    modules_to_save=["gate"],  # fully trainable, not LoRA
)
```

### 2. Apply LoRA to ALL Expert FFN Layers

Unlike dense models where you might skip FFN layers, MoE models benefit significantly from adapting expert weights. Each expert learns specialized knowledge, and LoRA on `gate_proj`, `up_proj`, `down_proj` across all experts is essential.

### 3. Monitor Expert Load Balance

During fine-tuning, monitor expert utilization to detect expert collapse (where one or two experts handle all tokens while others go unused):

```python
# After a forward pass, check router statistics
with torch.no_grad():
    outputs = model(**batch, output_router_logits=True)
    router_logits = outputs.router_logits  # list of (batch*seq, num_experts)
    for layer_idx, logits in enumerate(router_logits):
        probs = torch.softmax(logits, dim=-1)
        load = probs.mean(dim=0)  # average load per expert
        print(f"Layer {layer_idx}: expert load = {load.tolist()}")
        # Ideal: roughly uniform [0.125, 0.125, ...] for 8 experts
```

### 4. Auxiliary Loss for Load Balancing

If using the HuggingFace transformers MoE implementation, enable the auxiliary load-balancing loss:

```python
model.config.router_aux_loss_coef = 0.01  # weight of load-balancing loss
model.config.output_router_logits = True
```

### 5. Gradient Checkpointing Is Essential

With 8 experts per layer, MoE models use significantly more activation memory than dense models. Always enable gradient checkpointing for fine-tuning:

```python
model.gradient_checkpointing_enable()
# or via TrainingArguments:
# gradient_checkpointing=True
```

### 6. Effective Batch Size Matters More for MoE

MoE routing benefits from larger batches -- more tokens per batch means more diverse expert activation patterns. Use gradient accumulation to achieve effective batch sizes of at least 16.

---

## Troubleshooting

### OOM During Training

1. Reduce `per_device_train_batch_size` (2 -> 1)
2. Increase `gradient_accumulation_steps` to maintain effective batch
3. Enable gradient checkpointing if not already
4. Switch to QLoRA (4-bit) if using LoRA (BF16)
5. Reduce `max_seq_length` (2048 -> 1024)
6. Use `paged_adamw_8bit` optimizer

### Loss Spikes

MoE models can exhibit loss spikes when expert routing shifts suddenly:
- Reduce learning rate by 2-5x
- Increase warmup ratio (0.05 -> 0.10)
- Increase `router_aux_loss_coef` to enforce smoother routing
- Check if a specific expert has collapsed (load near zero)

### Expert Collapse

If one or more experts receive near-zero traffic:
- Increase `router_aux_loss_coef` (0.01 -> 0.05)
- Add router z-loss regularization
- Check that `modules_to_save=["gate"]` is set correctly
- Reduce learning rate -- aggressive updates can destabilize routing

### Slow Training

- Enable Flash Attention 2: `attn_implementation="flash_attention_2"`
- Use `packing=True` in SFTTrainer to avoid padding waste
- Increase `dataloader_num_workers`
- For multi-GPU: use FSDP or DeepSpeed ZeRO-3

### LoRA Adapter Not Loading

```python
# Verify adapter was saved correctly
from peft import PeftModel
model = PeftModel.from_pretrained(base_model, "./yua-moe-lora/final")

# If error about missing keys, check that target_modules match
# the original training configuration exactly
```

---

## Quick Reference: Which Method to Use

| Your Hardware | Method | Config |
|---|---|---|
| RTX 3060 12GB | QLoRA, batch=1, seq=1024 | r=16, accum=16 |
| RTX 3090/4090 24GB | QLoRA, batch=2, seq=2048 | r=32, accum=8 |
| A100 40GB | LoRA BF16, batch=4, seq=2048 | r=16, accum=4 |
| A100 80GB | LoRA BF16 or Full SFT | r=16 or full |
| 2x A100 80GB | Full SFT with FSDP | LR=5e-6 |
| TPU v4-8+ | Full SFT with MaxText | LR=5e-6 |

---

## References

- [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) (Hu et al., 2021)
- [QLoRA: Efficient Finetuning of Quantized LLMs](https://arxiv.org/abs/2305.14314) (Dettmers et al., 2023)
- [Mixture of Experts Explained](https://huggingface.co/blog/moe) (HuggingFace Blog)
- [MoE-Sieve: Routing-Guided LoRA for Efficient MoE Fine-Tuning](https://arxiv.org/html/2603.24044) (2026)
- [PEFT Documentation](https://huggingface.co/docs/peft) (HuggingFace)
- [TRL Documentation](https://huggingface.co/docs/trl) (HuggingFace)
