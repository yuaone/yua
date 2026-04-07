"""YUA — Text generation example.

Usage:
    python example_generate.py --checkpoint path/to/checkpoint.pt --prompt "Hello, I am YUA"
    python example_generate.py --checkpoint path/to/checkpoint.pt --prompt "안녕하세요" --temperature 0.7
"""

import argparse
import torch
import sentencepiece as spm

from src.model.config import YuaConfig
from src.model.yua_model import YuaModel


def main():
    parser = argparse.ArgumentParser(description="YUA text generation")
    parser.add_argument("--config", type=str, default="configs/model_moe_9b.yaml")
    parser.add_argument("--checkpoint", type=str, required=True)
    parser.add_argument("--tokenizer", type=str, default="data/tokenizer/yua_128k_v2.model")
    parser.add_argument("--prompt", type=str, default="Hello, I am YUA.")
    parser.add_argument("--max-tokens", type=int, default=256)
    parser.add_argument("--temperature", type=float, default=0.8)
    parser.add_argument("--top-k", type=int, default=50)
    parser.add_argument("--top-p", type=float, default=0.9)
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    args = parser.parse_args()

    # Load config
    config = YuaConfig.from_yaml(args.config)
    print(f"Model: {config.name} ({config.estimate_total_params() / 1e9:.1f}B total)")

    # Load tokenizer
    sp = spm.SentencePieceProcessor(model_file=args.tokenizer)
    print(f"Tokenizer: {sp.GetPieceSize()} vocab")

    # Load model
    model = YuaModel(config)
    state = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    model.load_state_dict(state["model"] if "model" in state else state)
    model = model.to(dtype=torch.bfloat16, device=args.device)
    model.eval()
    print(f"Checkpoint loaded: {args.checkpoint}")

    # Tokenize prompt
    input_ids = torch.tensor([sp.EncodeAsIds(args.prompt)], dtype=torch.long, device=args.device)
    print(f"\nPrompt: {args.prompt}")
    print(f"Tokens: {input_ids.shape[1]}")
    print("-" * 50)

    # Generate
    with torch.no_grad():
        output_ids = model.generate(
            input_ids,
            max_new_tokens=args.max_tokens,
            temperature=args.temperature,
            top_k=args.top_k,
            top_p=args.top_p,
        )

    # Decode
    generated = sp.DecodeIds(output_ids[0].tolist())
    print(generated)


if __name__ == "__main__":
    main()
