# ml/memory_learning/train_memory_rules.py
# 🔥 YUA PHASE 10 — Memory Rule Evolution
# - deterministic
# - postgres only
# - no ML / no GPU

import json
import os
import psycopg2
from pathlib import Path
from statistics import mean

BASE_DIR = Path(__file__).resolve().parent

THRESHOLD_PATH = BASE_DIR / "memory_thresholds.json"
SNAPSHOT_PATH = BASE_DIR / "memory_rule_snapshot.json"

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    raise RuntimeError("DATABASE_URL not set")

# --------------------------------------------------
# Load base thresholds
# --------------------------------------------------
with open(THRESHOLD_PATH, "r", encoding="utf-8") as f:
    BASE = json.load(f)

# --------------------------------------------------
# Fetch memory stats (PHASE 9-9.5 output)
# --------------------------------------------------
def fetch_stats(days: int = 30):
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    cur.execute(
        """
        SELECT
          confidence,
          usage_count,
          COALESCE(drift_score, 0),
          is_active
        FROM memory_records
        WHERE created_at >= NOW() - INTERVAL %s
        """,
        (f"{days} days",),
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

# --------------------------------------------------
# Rule Evolution (SSOT)
# --------------------------------------------------
def evolve_rules(rows):
    if not rows:
        raise RuntimeError("No memory data for evolution")

    confidences = [r[0] for r in rows if r[3]]
    drifts = [r[2] for r in rows if r[3]]
    usages = [r[1] for r in rows if r[3]]

    snapshot = {
        "auto_commit": {
            "min_confidence": round(max(BASE["auto_commit"]["min_confidence"], mean(confidences)), 3),
            "min_length": BASE["auto_commit"]["min_length"]
        },
        "drift": {
            "low": round(max(BASE["drift"]["low"], mean(drifts) * 0.8), 3),
            "medium": round(max(BASE["drift"]["medium"], mean(drifts)), 3),
            "high": round(max(BASE["drift"]["high"], mean(drifts) * 1.2), 3)
        },
        "merge": {
            "similarity_threshold": round(
                min(BASE["merge"]["similarity_threshold"], 0.95), 3
            )
        },
        "decay": {
            "base_rate": BASE["decay"]["base_rate"],
            "usage_bonus": BASE["decay"]["usage_bonus"]
        },
        "meta": {
            "sample_count": len(rows),
            "active_count": len(confidences)
        }
    }

    return snapshot

# --------------------------------------------------
# Train (actually: compute)
# --------------------------------------------------
def main():
    rows = fetch_stats()
    snapshot = evolve_rules(rows)

    with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2)

    print("[YUA][PHASE 10] Memory Rule Snapshot Generated")
    print(json.dumps(snapshot, indent=2))

if __name__ == "__main__":
    main()
