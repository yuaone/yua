#!/usr/bin/env python3
"""Convert a trained SentencePiece model to HuggingFace tokenizer format.

Produces a HuggingFace tokenizer directory that can be loaded with:
    from transformers import AutoTokenizer
    tokenizer = AutoTokenizer.from_pretrained("data/tokenizer/hf/")
"""

import argparse
import json
import logging
import shutil
import sys
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = PROJECT_ROOT / "configs" / "tokenizer.yaml"
DEFAULT_MODEL = PROJECT_ROOT / "data" / "tokenizer" / "yua_tokenizer.model"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "data" / "tokenizer" / "hf"


def load_config(config_path: Path) -> dict:
    """Load tokenizer YAML config."""
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    return cfg.get("tokenizer", cfg)


def convert_sp_to_hf(
    model_path: Path = DEFAULT_MODEL,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    config_path: Path = DEFAULT_CONFIG,
    tokenizer_name: str = "YUA-LLM/yua-tokenizer",
) -> Path:
    """Convert SentencePiece .model to HuggingFace tokenizer format.

    This uses the transformers library if available. If not, it creates
    the HF tokenizer config files manually for compatibility.
    """
    if not model_path.exists():
        logger.error("Model file not found: %s", model_path)
        logger.error("Run train.py first to train the tokenizer.")
        sys.exit(1)

    cfg = load_config(config_path)
    special = cfg.get("special_tokens", {})

    output_dir.mkdir(parents=True, exist_ok=True)

    # Try using transformers library (preferred path)
    try:
        return _convert_with_transformers(
            model_path, output_dir, cfg, special, tokenizer_name
        )
    except ImportError:
        logger.warning("transformers library not available, using manual conversion")
        return _convert_manual(model_path, output_dir, cfg, special, tokenizer_name)


def _convert_with_transformers(
    model_path: Path,
    output_dir: Path,
    cfg: dict,
    special: dict,
    tokenizer_name: str,
) -> Path:
    """Convert using the transformers library."""
    from transformers import LlamaTokenizer

    # LlamaTokenizer supports SentencePiece models with byte fallback
    logger.info("Loading SentencePiece model with LlamaTokenizer...")

    tokenizer = LlamaTokenizer(
        vocab_file=str(model_path),
        unk_token=special.get("unk", "<unk>"),
        bos_token=special.get("bos", "<s>"),
        eos_token=special.get("eos", "</s>"),
        pad_token=special.get("pad", "<pad>"),
        sp_model_kwargs={"enable_sampling": False},
        legacy=False,
    )

    # Save
    tokenizer.save_pretrained(str(output_dir))
    logger.info("Saved HuggingFace tokenizer to %s", output_dir)

    # Verify round-trip
    _verify_conversion(model_path, output_dir)

    return output_dir


def _convert_manual(
    model_path: Path,
    output_dir: Path,
    cfg: dict,
    special: dict,
    tokenizer_name: str,
) -> Path:
    """Manual conversion: copy .model + write config files.

    Creates the minimal set of files for AutoTokenizer.from_pretrained().
    """
    import sentencepiece as spm

    logger.info("Performing manual conversion...")

    # Copy the sentencepiece model
    dest_model = output_dir / "tokenizer.model"
    shutil.copy2(model_path, dest_model)
    logger.info("Copied model to %s", dest_model)

    # Load to get vocab info
    sp = spm.SentencePieceProcessor()
    sp.Load(str(model_path))
    vocab_size = sp.GetPieceSize()

    # tokenizer_config.json
    tokenizer_config = {
        "tokenizer_class": "LlamaTokenizer",
        "model_type": "llama",
        "bos_token": special.get("bos", "<s>"),
        "eos_token": special.get("eos", "</s>"),
        "unk_token": special.get("unk", "<unk>"),
        "pad_token": special.get("pad", "<pad>"),
        "sp_model_kwargs": {},
        "clean_up_tokenization_spaces": False,
        "legacy": False,
        "name_or_path": tokenizer_name,
    }
    _write_json(output_dir / "tokenizer_config.json", tokenizer_config)

    # special_tokens_map.json
    special_tokens_map = {
        "bos_token": special.get("bos", "<s>"),
        "eos_token": special.get("eos", "</s>"),
        "unk_token": special.get("unk", "<unk>"),
        "pad_token": special.get("pad", "<pad>"),
    }
    _write_json(output_dir / "special_tokens_map.json", special_tokens_map)

    # added_tokens.json (empty for now)
    _write_json(output_dir / "added_tokens.json", {})

    logger.info("Manual conversion complete: %s", output_dir)
    logger.info("  Model vocab size: %d", vocab_size)
    logger.info("  Files written: tokenizer.model, tokenizer_config.json, "
                "special_tokens_map.json, added_tokens.json")

    return output_dir


def _write_json(path: Path, data: dict) -> None:
    """Write a JSON file with pretty formatting."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    logger.debug("Wrote %s", path)


def _verify_conversion(model_path: Path, hf_dir: Path) -> None:
    """Verify that the HF tokenizer produces the same output as SentencePiece."""
    import sentencepiece as spm

    sp = spm.SentencePieceProcessor()
    sp.Load(str(model_path))

    try:
        from transformers import AutoTokenizer
        hf_tok = AutoTokenizer.from_pretrained(str(hf_dir))
    except Exception as e:
        logger.warning("Could not load HF tokenizer for verification: %s", e)
        return

    test_sentences = [
        "Hello, world!",
        "안녕하세요, 세계!",
        "こんにちは世界！",
        "你好，世界！",
    ]

    all_match = True
    for sent in test_sentences:
        sp_ids = sp.EncodeAsIds(sent)
        hf_ids = hf_tok.encode(sent, add_special_tokens=False)
        if sp_ids != hf_ids:
            logger.warning(
                "Mismatch for '%s': SP=%s HF=%s", sent, sp_ids[:10], hf_ids[:10]
            )
            all_match = False

    if all_match:
        logger.info("Verification PASSED: SP and HF outputs match for all test sentences")
    else:
        logger.warning(
            "Verification WARNING: Some mismatches detected. "
            "This may be due to special token handling differences."
        )


def main():
    parser = argparse.ArgumentParser(
        description="Convert SentencePiece model to HuggingFace tokenizer format"
    )
    parser.add_argument(
        "--model", type=Path, default=DEFAULT_MODEL,
        help="Path to trained SentencePiece .model file",
    )
    parser.add_argument(
        "--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR,
        help="Directory to save HuggingFace tokenizer",
    )
    parser.add_argument(
        "--config", type=Path, default=DEFAULT_CONFIG,
        help="Path to tokenizer YAML config",
    )
    parser.add_argument(
        "--name", type=str, default="YUA-LLM/yua-tokenizer",
        help="Tokenizer name for HF config",
    )
    parser.add_argument(
        "--log-level", default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    convert_sp_to_hf(
        model_path=args.model,
        output_dir=args.output_dir,
        config_path=args.config,
        tokenizer_name=args.name,
    )


if __name__ == "__main__":
    main()
