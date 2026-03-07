# 📂 ml/memory_learning/export_rules.py
# 🔥 YUA Memory Rule Exporter — PHASE 9-9.5 FINAL

import json
from pathlib import Path
from extract_memory_stats import extract_memory_stats
from train_memory_rules import train_rules


BASE_DIR = Path(__file__).resolve().parent
OUT = BASE_DIR / "memory-rules.json"


def main():
    print("[YUA] extracting memory stats...")
    stats = extract_memory_stats(days=30)

    print(f"[YUA] samples: {len(stats)}")

    rules = train_rules(stats)

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(rules, f, indent=2, ensure_ascii=False)

    print(f"[YUA] rules exported → {OUT}")


if __name__ == "__main__":
    main()
