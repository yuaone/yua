#!/usr/bin/env python3
"""Evaluate a trained SentencePiece tokenizer for YUA-LLM.

Measures per-language metrics:
  - compression_ratio: characters per token
  - fertility: tokens per sentence
  - byte_fallback_rate: fraction of tokens that are byte fallback pieces
  - token_inflation: fertility relative to English baseline
  - language_fairness_gap: max fertility ratio across languages
"""

import argparse
import json
import logging
import sys
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import sentencepiece as spm
import yaml

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = PROJECT_ROOT / "configs" / "tokenizer.yaml"
DEFAULT_MODEL = PROJECT_ROOT / "data" / "tokenizer" / "yua_tokenizer.model"
DEFAULT_EVAL_DIR = PROJECT_ROOT / "data" / "clean"


def load_config(config_path: Path) -> dict:
    """Load tokenizer YAML config."""
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    return cfg.get("tokenizer", cfg)


# Built-in evaluation sentences when no eval corpus is available
BUILTIN_EVAL_SENTENCES: Dict[str, List[str]] = {
    "ko": [
        "대한민국은 민주공화국이다.",
        "인공지능 기술이 빠르게 발전하고 있습니다.",
        "서울특별시는 대한민국의 수도입니다.",
        "오늘 날씨가 매우 좋습니다. 산책하러 갈까요?",
        "자연어 처리는 컴퓨터가 인간의 언어를 이해하고 생성하는 기술입니다.",
        "한국어 형태소 분석은 토크나이저 설계에서 중요한 고려사항입니다.",
        "딥러닝 모델의 학습에는 대규모 데이터셋이 필요합니다.",
        "유아 언어 모델은 다국어를 지원하는 대규모 언어 모델입니다.",
    ],
    "en": [
        "The United States is a federal republic.",
        "Artificial intelligence technology is advancing rapidly.",
        "Natural language processing enables computers to understand human language.",
        "The weather is very nice today. Shall we go for a walk?",
        "Large language models require massive datasets for training.",
        "Tokenization is a critical preprocessing step in NLP pipelines.",
        "The transformer architecture revolutionized deep learning for text.",
        "YUA is a multilingual large language model supporting Korean, English, Japanese, and Chinese.",
    ],
    "ja": [
        "日本は島国です。",
        "人工知能技術が急速に進歩しています。",
        "東京は日本の首都です。",
        "今日はとても良い天気です。散歩に行きましょうか？",
        "自然言語処理はコンピュータが人間の言語を理解する技術です。",
        "トークナイザーの設計は言語モデルの性能に大きく影響します。",
        "深層学習モデルの訓練には大規模なデータセットが必要です。",
        "YUAは多言語をサポートする大規模言語モデルです。",
    ],
    "zh": [
        "中华人民共和国是世界上人口最多的国家之一。",
        "人工智能技术正在快速发展。",
        "北京是中国的首都。",
        "今天天气很好。我们去散步好吗？",
        "自然语言处理是让计算机理解人类语言的技术。",
        "分词器的设计对语言模型的性能有很大影响。",
        "深度学习模型的训练需要大规模的数据集。",
        "YUA是一个支持多语言的大型语言模型。",
    ],
}


def load_eval_sentences(
    eval_dir: Path,
    languages: List[str],
    max_per_lang: int = 500,
) -> Dict[str, List[str]]:
    """Load evaluation sentences from JSONL files, falling back to built-in set."""
    sentences: Dict[str, List[str]] = defaultdict(list)

    # Try loading from eval_dir
    if eval_dir.exists():
        for fpath in sorted(eval_dir.rglob("*.jsonl")):
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        doc = json.loads(line)
                        lang = doc.get("language", "")
                        text = doc.get("text", "").strip()
                        if lang in languages and text and len(sentences[lang]) < max_per_lang:
                            # Take first paragraph as a sentence
                            first_para = text.split("\n")[0].strip()
                            if first_para:
                                sentences[lang].append(first_para)
            except (json.JSONDecodeError, OSError) as e:
                logger.warning("Error reading %s: %s", fpath, e)

    # Fall back to built-in for languages with insufficient data
    for lang in languages:
        if len(sentences[lang]) < 5:
            if lang in BUILTIN_EVAL_SENTENCES:
                logger.info("Using built-in eval sentences for '%s' (%d available from corpus)",
                            lang, len(sentences[lang]))
                sentences[lang] = BUILTIN_EVAL_SENTENCES[lang]
            elif not sentences[lang]:
                logger.warning("No eval sentences for '%s'", lang)

    return dict(sentences)


def is_byte_fallback_token(piece: str) -> bool:
    """Check if a SentencePiece token is a byte fallback token.

    Byte fallback tokens look like <0xAB>.
    """
    return piece.startswith("<0x") and piece.endswith(">") and len(piece) == 6


def compute_metrics(
    sp: spm.SentencePieceProcessor,
    sentences: Dict[str, List[str]],
) -> Dict[str, Dict[str, float]]:
    """Compute all evaluation metrics per language.

    Returns:
        Dict mapping language -> metric_name -> value
    """
    results: Dict[str, Dict[str, float]] = {}

    for lang, sents in sentences.items():
        if not sents:
            continue

        total_chars = 0
        total_tokens = 0
        total_byte_fallback_tokens = 0
        total_sentences = len(sents)
        sentence_token_counts = []

        for sent in sents:
            pieces = sp.EncodeAsPieces(sent)
            n_tokens = len(pieces)
            n_chars = len(sent)
            n_byte_fb = sum(1 for p in pieces if is_byte_fallback_token(p))

            total_chars += n_chars
            total_tokens += n_tokens
            total_byte_fallback_tokens += n_byte_fb
            sentence_token_counts.append(n_tokens)

        compression_ratio = total_chars / total_tokens if total_tokens > 0 else 0.0
        fertility = total_tokens / total_sentences if total_sentences > 0 else 0.0
        byte_fallback_rate = (
            total_byte_fallback_tokens / total_tokens if total_tokens > 0 else 0.0
        )

        results[lang] = {
            "compression_ratio": round(compression_ratio, 3),
            "fertility": round(fertility, 2),
            "byte_fallback_rate": round(byte_fallback_rate, 4),
            "total_sentences": total_sentences,
            "total_chars": total_chars,
            "total_tokens": total_tokens,
        }

    # Compute token_inflation (relative to English baseline)
    en_fertility = results.get("en", {}).get("fertility", 1.0)
    if en_fertility == 0:
        en_fertility = 1.0

    for lang, metrics in results.items():
        metrics["token_inflation"] = round(
            metrics["fertility"] / en_fertility, 3
        )

    # Compute language_fairness_gap
    fertilities = [m["fertility"] for m in results.values() if m["fertility"] > 0]
    if len(fertilities) >= 2:
        fairness_gap = round(max(fertilities) / min(fertilities), 3)
    else:
        fairness_gap = 1.0

    for lang in results:
        results[lang]["language_fairness_gap"] = fairness_gap

    return results


def print_results_table(results: Dict[str, Dict[str, float]]) -> None:
    """Print a formatted table of evaluation results."""
    if not results:
        logger.warning("No results to display")
        return

    # Header
    metrics = [
        "compression_ratio",
        "fertility",
        "byte_fallback_rate",
        "token_inflation",
    ]
    col_widths = {
        "lang": 6,
        "compression_ratio": 12,
        "fertility": 10,
        "byte_fallback_rate": 16,
        "token_inflation": 16,
        "sentences": 10,
    }

    header = (
        f"{'Lang':<{col_widths['lang']}} "
        f"{'Comp.Ratio':>{col_widths['compression_ratio']}} "
        f"{'Fertility':>{col_widths['fertility']}} "
        f"{'ByteFB Rate':>{col_widths['byte_fallback_rate']}} "
        f"{'Token Inflation':>{col_widths['token_inflation']}} "
        f"{'Sentences':>{col_widths['sentences']}}"
    )
    separator = "-" * len(header)

    print()
    print("=" * len(header))
    print("  YUA Tokenizer Evaluation Results")
    print("=" * len(header))
    print(header)
    print(separator)

    for lang in sorted(results.keys()):
        m = results[lang]
        print(
            f"{lang:<{col_widths['lang']}} "
            f"{m['compression_ratio']:>{col_widths['compression_ratio']}.3f} "
            f"{m['fertility']:>{col_widths['fertility']}.2f} "
            f"{m['byte_fallback_rate']:>{col_widths['byte_fallback_rate']}.4f} "
            f"{m['token_inflation']:>{col_widths['token_inflation']}.3f} "
            f"{m['total_sentences']:>{col_widths['sentences']}d}"
        )

    print(separator)

    # Global fairness gap
    fairness_gap = next(iter(results.values())).get("language_fairness_gap", 1.0)
    print(f"\n  Language Fairness Gap: {fairness_gap:.3f}")
    if fairness_gap < 1.5:
        print("  Status: GOOD (gap < 1.5)")
    elif fairness_gap < 2.0:
        print("  Status: ACCEPTABLE (gap < 2.0)")
    else:
        print("  Status: NEEDS IMPROVEMENT (gap >= 2.0)")
    print()


def evaluate_tokenizer(
    model_path: Path = DEFAULT_MODEL,
    config_path: Path = DEFAULT_CONFIG,
    eval_dir: Path = DEFAULT_EVAL_DIR,
    max_per_lang: int = 500,
) -> Dict[str, Dict[str, float]]:
    """Main evaluation entry point."""
    if not model_path.exists():
        logger.error("Model file not found: %s", model_path)
        logger.error("Run train.py first to train the tokenizer.")
        sys.exit(1)

    cfg = load_config(config_path)
    lang_weights = cfg.get("language_weights", {})
    languages = [l for l in lang_weights.keys() if l != "other"]

    logger.info("Loading tokenizer from %s", model_path)
    sp = spm.SentencePieceProcessor()
    sp.Load(str(model_path))
    logger.info("Vocab size: %d", sp.GetPieceSize())

    logger.info("Loading evaluation sentences for: %s", languages)
    sentences = load_eval_sentences(eval_dir, languages, max_per_lang)

    logger.info("Computing metrics...")
    results = compute_metrics(sp, sentences)
    print_results_table(results)

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate a trained SentencePiece tokenizer"
    )
    parser.add_argument(
        "--model", type=Path, default=DEFAULT_MODEL,
        help="Path to trained .model file",
    )
    parser.add_argument(
        "--config", type=Path, default=DEFAULT_CONFIG,
        help="Path to tokenizer YAML config",
    )
    parser.add_argument(
        "--eval-dir", type=Path, default=DEFAULT_EVAL_DIR,
        help="Directory with JSONL files for evaluation",
    )
    parser.add_argument(
        "--max-per-lang", type=int, default=500,
        help="Max evaluation sentences per language",
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

    evaluate_tokenizer(
        model_path=args.model,
        config_path=args.config,
        eval_dir=args.eval_dir,
        max_per_lang=args.max_per_lang,
    )


if __name__ == "__main__":
    main()
