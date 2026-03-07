# 📂 ml/memory_learning/extract_memory_stats.py
# 🔥 YUA Memory Stats Extractor — PHASE 9-9.5 FINAL
# - deterministic
# - postgres only
# - no ML
# - training snapshot source

import os
from typing import List, Dict, Any
from datetime import datetime

import psycopg2
from dotenv import load_dotenv


# --------------------------------------------------
# 🔑 ENV LOAD (SSOT)
# --------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, "..", ".env")

load_dotenv(ENV_PATH)

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    raise RuntimeError("DATABASE_URL not set")


# --------------------------------------------------
# 🔍 Extract Memory Stats
# --------------------------------------------------
def extract_memory_stats(days: int = 30) -> List[Dict[str, Any]]:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    cur.execute(
        """
        SELECT
          scope,
          source,
          confidence,
          usage_count,
          COALESCE(drift_score, 0),
          created_at,
          is_active,
          merged_to
        FROM memory_records
        WHERE created_at >= NOW() - INTERVAL %s
        """,
        (f"{days} days",),
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    stats: List[Dict[str, Any]] = []

    for (
        scope,
        source,
        confidence,
        usage_count,
        drift_score,
        created_at,
        is_active,
        merged_to,
    ) in rows:
        stats.append(
            {
                "scope": scope,
                "source": source,
                "confidence": float(confidence),
                "usage_count": int(usage_count or 0),
                "drift_score": float(drift_score or 0),
                "age_days": (
                    (datetime.utcnow() - created_at).days
                    if created_at
                    else 0
                ),
                "is_active": bool(is_active),
                "merged": merged_to is not None,
            }
        )

    return stats


# --------------------------------------------------
# 🧪 CLI Execution
# --------------------------------------------------
if __name__ == "__main__":
    data = extract_memory_stats(days=30)

    print(f"[YUA][PHASE 9-9.5] extracted = {len(data)} records")

    # 샘플 5개만 출력 (과다 출력 방지)
    for row in data[:5]:
        print(row)
