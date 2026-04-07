#!/usr/bin/env python3
"""Train a SentencePiece tokenizer for YUA-LLM.

Reads config from configs/tokenizer.yaml and trains a SentencePiece
unigram model with byte fallback. All parameters can be overridden
via CLI arguments.
"""

import argparse
import logging
import sys
from pathlib import Path

import sentencepiece as spm
import yaml

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = PROJECT_ROOT / "configs" / "tokenizer.yaml"
DEFAULT_CORPUS = PROJECT_ROOT / "data" / "tokenizer" / "corpus.txt"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "data" / "tokenizer"


def load_config(config_path: Path) -> dict:
    """Load tokenizer YAML config."""
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    return cfg.get("tokenizer", cfg)


MODEL_TYPE_MAP = {
    "sentencepiece_unigram": "unigram",
    "unigram": "unigram",
    "bpe": "bpe",
    "char": "char",
    "word": "word",
}


def train_tokenizer(
    corpus_path: Path = DEFAULT_CORPUS,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    config_path: Path = DEFAULT_CONFIG,
    vocab_size: int | None = None,
    model_type: str | None = None,
    character_coverage: float | None = None,
    byte_fallback: bool | None = None,
    model_prefix: str = "yua_tokenizer",
    num_threads: int = 4,
    input_sentence_size: int = 0,
    shuffle_input_sentence: bool = True,
) -> Path:
    """Train a SentencePiece model.

    Returns the path to the trained .model file.
    """
    if not corpus_path.exists():
        logger.error("Corpus file not found: %s", corpus_path)
        logger.error("Run prepare_corpus.py first to create the training corpus.")
        sys.exit(1)

    cfg = load_config(config_path)

    # Resolve parameters: CLI override > config > defaults
    _vocab_size = vocab_size or cfg.get("vocab_size", 250000)
    _model_type = model_type or MODEL_TYPE_MAP.get(
        cfg.get("type", "unigram"), "unigram"
    )
    _char_coverage = character_coverage or cfg.get("character_coverage", 0.9995)
    _byte_fallback = byte_fallback if byte_fallback is not None else cfg.get("byte_fallback", True)

    # Special tokens
    special = cfg.get("special_tokens", {})
    pad_token = special.get("pad", "<pad>")
    unk_token = special.get("unk", "<unk>")
    bos_token = special.get("bos", "<s>")
    eos_token = special.get("eos", "</s>")

    # Extra config
    split_by_whitespace = cfg.get("split_by_whitespace", True)
    split_digits = cfg.get("split_digits", True)
    max_sp_length = cfg.get("max_sentencepiece_length", 16)

    # Normalization
    normalization = cfg.get("normalization", "nfkc")
    normalization_rule_name = normalization if normalization else "nfkc"

    output_dir.mkdir(parents=True, exist_ok=True)
    model_prefix_path = str(output_dir / model_prefix)

    logger.info("=" * 60)
    logger.info("SentencePiece Training Configuration")
    logger.info("=" * 60)
    logger.info("  corpus:             %s", corpus_path)
    logger.info("  model_type:         %s", _model_type)
    logger.info("  vocab_size:         %d", _vocab_size)
    logger.info("  character_coverage: %.4f", _char_coverage)
    logger.info("  byte_fallback:      %s", _byte_fallback)
    logger.info("  normalization:      %s", normalization_rule_name)
    logger.info("  split_by_whitespace:%s", split_by_whitespace)
    logger.info("  split_digits:       %s", split_digits)
    logger.info("  max_sp_length:      %d", max_sp_length)
    logger.info("  output_prefix:      %s", model_prefix_path)
    logger.info("=" * 60)

    # Build training command
    train_args = dict(
        input=str(corpus_path),
        model_prefix=model_prefix_path,
        vocab_size=_vocab_size,
        model_type=_model_type,
        character_coverage=_char_coverage,
        byte_fallback=_byte_fallback,
        normalization_rule_name=normalization_rule_name,
        split_by_whitespace=split_by_whitespace,
        split_digits=split_digits,
        max_sentencepiece_length=max_sp_length,
        pad_id=3,
        pad_piece=pad_token,
        unk_id=0,
        unk_piece=unk_token,
        bos_id=1,
        bos_piece=bos_token,
        eos_id=2,
        eos_piece=eos_token,
        num_threads=num_threads,
        train_extremely_large_corpus=False,
    )

    if input_sentence_size > 0:
        train_args["input_sentence_size"] = input_sentence_size
        train_args["shuffle_input_sentence"] = shuffle_input_sentence

    logger.info("Starting SentencePiece training...")
    spm.SentencePieceTrainer.Train(**train_args)

    model_path = Path(model_prefix_path + ".model")
    vocab_path = Path(model_prefix_path + ".vocab")

    logger.info("Training complete!")
    logger.info("  Model: %s (%.1f MB)", model_path,
                model_path.stat().st_size / 1024 / 1024)
    logger.info("  Vocab: %s", vocab_path)

    # Quick sanity check
    sp = spm.SentencePieceProcessor()
    sp.Load(str(model_path))
    logger.info("  Loaded vocab size: %d", sp.GetPieceSize())

    test_sentences = {
        "ko": "안녕하세요, 유아 언어 모델입니다.",
        "en": "Hello, this is the YUA language model.",
        "ja": "こんにちは、YUA言語モデルです。",
        "zh": "你好，这是YUA语言模型。",
    }
    logger.info("  Sample tokenizations:")
    for lang, sent in test_sentences.items():
        tokens = sp.EncodeAsPieces(sent)
        logger.info("    [%s] %s -> %s (%d tokens)",
                     lang, sent, tokens[:8], len(tokens))

    return model_path


def main():
    parser = argparse.ArgumentParser(
        description="Train a SentencePiece tokenizer for YUA-LLM"
    )
    parser.add_argument(
        "--config", type=Path, default=DEFAULT_CONFIG,
        help="Path to tokenizer YAML config",
    )
    parser.add_argument(
        "--corpus", type=Path, default=DEFAULT_CORPUS,
        help="Path to training corpus text file",
    )
    parser.add_argument(
        "--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR,
        help="Directory to save trained model",
    )
    parser.add_argument(
        "--model-prefix", type=str, default="yua_tokenizer",
        help="Prefix for output model files",
    )
    parser.add_argument(
        "--vocab-size", type=int, default=None,
        help="Override vocab size from config",
    )
    parser.add_argument(
        "--model-type", type=str, default=None,
        choices=["unigram", "bpe", "char", "word"],
        help="Override model type from config",
    )
    parser.add_argument(
        "--character-coverage", type=float, default=None,
        help="Override character coverage from config",
    )
    parser.add_argument(
        "--byte-fallback", type=bool, default=None,
        help="Override byte fallback setting from config",
    )
    parser.add_argument(
        "--num-threads", type=int, default=4,
        help="Number of threads for training",
    )
    parser.add_argument(
        "--input-sentence-size", type=int, default=0,
        help="Limit input sentences (0 = use all). Useful for large corpora.",
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

    train_tokenizer(
        corpus_path=args.corpus,
        output_dir=args.output_dir,
        config_path=args.config,
        vocab_size=args.vocab_size,
        model_type=args.model_type,
        character_coverage=args.character_coverage,
        byte_fallback=args.byte_fallback,
        model_prefix=args.model_prefix,
        num_threads=args.num_threads,
        input_sentence_size=args.input_sentence_size,
    )


if __name__ == "__main__":
    main()
