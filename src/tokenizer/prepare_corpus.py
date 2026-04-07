#!/usr/bin/env python3
"""Prepare a language-reweighted training corpus for SentencePiece tokenizer.

Reads cleaned JSONL files from data/clean/, samples documents according to
language weights defined in configs/tokenizer.yaml, and writes a single
plain-text file (one sentence per line) for SentencePiece training.
"""

import argparse
import json
import logging
import os
import random
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional

import yaml

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = PROJECT_ROOT / "configs" / "tokenizer.yaml"
DEFAULT_INPUT_DIR = PROJECT_ROOT / "data" / "clean"
DEFAULT_OUTPUT = PROJECT_ROOT / "data" / "tokenizer" / "corpus.txt"


def load_config(config_path: Path) -> dict:
    """Load tokenizer YAML config."""
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    return cfg.get("tokenizer", cfg)


def scan_jsonl_files(input_dir: Path) -> List[Path]:
    """Recursively find all .jsonl and .jsonl.gz files."""
    files = []
    for ext in ("*.jsonl", "*.jsonl.gz"):
        files.extend(input_dir.rglob(ext))
    return sorted(files)


def read_jsonl(path: Path):
    """Yield documents from a JSONL file (plain or gzipped)."""
    open_fn = open
    if path.suffix == ".gz":
        import gzip
        open_fn = gzip.open

    with open_fn(path, "rt", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                doc = json.loads(line)
                yield doc
            except json.JSONDecodeError:
                logger.warning("Skipping malformed JSON at %s:%d", path, line_num)


def bucket_documents_by_language(
    input_dir: Path,
    language_weights: Dict[str, float],
) -> Dict[str, List[str]]:
    """Read all JSONL files and bucket text by language.

    Returns a dict mapping language code -> list of text strings.
    Languages not in language_weights are bucketed under 'other'.
    """
    known_langs = set(language_weights.keys()) - {"other"}
    buckets: Dict[str, List[str]] = defaultdict(list)

    files = scan_jsonl_files(input_dir)
    if not files:
        logger.warning("No JSONL files found in %s", input_dir)
        return buckets

    logger.info("Scanning %d JSONL files in %s", len(files), input_dir)
    for fpath in files:
        for doc in read_jsonl(fpath):
            text = doc.get("text", "").strip()
            if not text:
                continue
            lang = doc.get("language", "other")
            if lang not in known_langs:
                lang = "other"
            buckets[lang].append(text)

    for lang, texts in buckets.items():
        logger.info("  %s: %d documents", lang, len(texts))

    return buckets


def resample_by_weight(
    buckets: Dict[str, List[str]],
    language_weights: Dict[str, float],
    target_lines: int,
    seed: int = 42,
) -> List[str]:
    """Sample documents from each language bucket according to weights.

    If a bucket has fewer documents than its allocation, all documents
    are included and the surplus is redistributed proportionally.
    """
    rng = random.Random(seed)

    # Normalize weights for languages that actually have data
    active_weights = {}
    for lang, weight in language_weights.items():
        if buckets.get(lang):
            active_weights[lang] = weight
    if not active_weights:
        logger.error("No data for any configured language")
        return []

    total_w = sum(active_weights.values())
    active_weights = {k: v / total_w for k, v in active_weights.items()}

    # Compute allocations
    allocations: Dict[str, int] = {}
    for lang, w in active_weights.items():
        allocations[lang] = int(target_lines * w)

    # Cap by available data, redistribute surplus
    surplus = 0
    capped_langs = set()
    for lang, alloc in allocations.items():
        available = len(buckets[lang])
        if alloc > available:
            surplus += alloc - available
            allocations[lang] = available
            capped_langs.add(lang)

    # Redistribute surplus to non-capped languages
    uncapped = {k: v for k, v in active_weights.items() if k not in capped_langs}
    if uncapped and surplus > 0:
        total_uncapped_w = sum(uncapped.values())
        for lang, w in uncapped.items():
            extra = int(surplus * w / total_uncapped_w)
            allocations[lang] = min(
                allocations[lang] + extra, len(buckets[lang])
            )

    result = []
    for lang, alloc in allocations.items():
        docs = buckets[lang]
        if alloc >= len(docs):
            sampled = docs[:]
        else:
            sampled = rng.sample(docs, alloc)
        logger.info("Sampling %d / %d docs for '%s'", len(sampled), len(docs), lang)
        result.extend(sampled)

    rng.shuffle(result)
    return result


def split_into_lines(texts: List[str], max_line_chars: int = 4096) -> List[str]:
    """Split long documents into shorter lines for SentencePiece.

    SentencePiece reads one sentence per line. We split on newlines
    and further truncate very long lines.
    """
    lines = []
    for text in texts:
        for paragraph in text.split("\n"):
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            if len(paragraph) <= max_line_chars:
                lines.append(paragraph)
            else:
                # Chunk long paragraphs
                for i in range(0, len(paragraph), max_line_chars):
                    chunk = paragraph[i : i + max_line_chars].strip()
                    if chunk:
                        lines.append(chunk)
    return lines


def write_corpus(lines: List[str], output_path: Path) -> None:
    """Write lines to a plain text file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for line in lines:
            f.write(line + "\n")
    logger.info("Wrote %d lines to %s (%.1f MB)",
                len(lines), output_path,
                output_path.stat().st_size / 1024 / 1024)


def prepare_corpus(
    config_path: Path = DEFAULT_CONFIG,
    input_dir: Path = DEFAULT_INPUT_DIR,
    output_path: Path = DEFAULT_OUTPUT,
    target_lines: int = 10_000_000,
    seed: int = 42,
) -> Path:
    """Main entry: bucket, resample, split, write."""
    cfg = load_config(config_path)
    language_weights = cfg.get("language_weights", {
        "ko": 0.30, "en": 0.30, "ja": 0.15, "zh": 0.15, "other": 0.10,
    })

    logger.info("Language weights: %s", language_weights)
    logger.info("Target lines: %d", target_lines)

    buckets = bucket_documents_by_language(input_dir, language_weights)
    if not buckets:
        logger.error("No documents found. Place JSONL files in %s", input_dir)
        sys.exit(1)

    texts = resample_by_weight(buckets, language_weights, target_lines, seed)
    lines = split_into_lines(texts)
    write_corpus(lines, output_path)
    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="Prepare language-reweighted corpus for SentencePiece training"
    )
    parser.add_argument(
        "--config", type=Path, default=DEFAULT_CONFIG,
        help="Path to tokenizer YAML config",
    )
    parser.add_argument(
        "--input-dir", type=Path, default=DEFAULT_INPUT_DIR,
        help="Directory containing cleaned JSONL files",
    )
    parser.add_argument(
        "--output", type=Path, default=DEFAULT_OUTPUT,
        help="Output corpus text file path",
    )
    parser.add_argument(
        "--target-lines", type=int, default=10_000_000,
        help="Target number of text lines to sample",
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed for reproducibility",
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

    prepare_corpus(
        config_path=args.config,
        input_dir=args.input_dir,
        output_path=args.output,
        target_lines=args.target_lines,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()
