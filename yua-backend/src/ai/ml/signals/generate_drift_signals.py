# 🔥 YUA Drift → Signal Generator (SSOT FINAL)
# - deterministic
# - postgres only
# - NO ML
# - write-only (signal_library)

import os
import json
import psycopg2
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    raise RuntimeError("DATABASE_URL not set")

WINDOW_RECENT = "24 hours"
WINDOW_BASELINE = "7 days"

DRIFT_THRESHOLD = 0.30  # 🔒 SSOT

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    cur.execute("""
    SELECT
      path,
      r_conf, r_success, r_verifier,
      b_conf, b_success, b_verifier
    FROM (
      WITH recent AS (
        SELECT
          path,
          AVG(confidence) AS r_conf,
          AVG(CASE WHEN verdict='APPROVE' THEN 1 ELSE 0 END) AS r_success,
          SUM(CASE WHEN verifier_failed THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) AS r_verifier
        FROM runtime_statistics
        WHERE created_at >= NOW() - INTERVAL %s
        GROUP BY path
      ),
      baseline AS (
        SELECT
          path,
          AVG(confidence) AS b_conf,
          AVG(CASE WHEN verdict='APPROVE' THEN 1 ELSE 0 END) AS b_success,
          SUM(CASE WHEN verifier_failed THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) AS b_verifier
        FROM runtime_statistics
        WHERE created_at >= NOW() - INTERVAL %s
          AND created_at < NOW() - INTERVAL %s
        GROUP BY path
      )
      SELECT
        r.path,
        r.r_conf, r.r_success, r.r_verifier,
        b.b_conf, b.b_success, b.b_verifier
      FROM recent r
      JOIN baseline b ON r.path = b.path
    ) t
    """, (WINDOW_RECENT, WINDOW_BASELINE, WINDOW_RECENT))

    rows = cur.fetchall()

    now = datetime.utcnow()
    window_from = now - timedelta(hours=24)

    for (
        path,
        r_conf, r_success, r_verifier,
        b_conf, b_success, b_verifier
    ) in rows:

        if b_success is None:
            continue

        confidence_drop = max(0, (b_conf or 0) - (r_conf or 0))
        success_drop = max(0, (b_success or 0) - (r_success or 0))
        verifier_spike = max(0, (r_verifier or 0) - (b_verifier or 0))

        drift_score = min(1.0,
            confidence_drop * 0.4 +
            success_drop * 0.4 +
            verifier_spike * 0.2
        )

        if drift_score < DRIFT_THRESHOLD:
            continue

        value = {
            "path": path,
            "confidence_drop": round(confidence_drop, 3),
            "success_drop": round(success_drop, 3),
            "verifier_spike": round(verifier_spike, 3),
            "drift_score": round(drift_score, 3),
        }

        cur.execute("""
        INSERT INTO signal_library (
          kind, scope, target,
          value, confidence,
          window_from, window_to,
          generated_by
        )
        VALUES (
          'DRIFT', 'PATH', %s,
          %s::jsonb, %s,
          %s, %s,
          'STAT_RULE'
        )
        """, (
            path,
            json.dumps(value),
            drift_score,
            window_from,
            now,
        ))

    conn.commit()
    cur.close()
    conn.close()

    print("[YUA] Drift signals generated")

if __name__ == "__main__":
    main()
