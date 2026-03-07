import psycopg2
import torch

def load_anchor_stats(conn):
    cur = conn.cursor()
    cur.execute("""
      SELECT anchor, shown, clicked, ctr
      FROM flow_anchor_daily_stats
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    """)
    rows = cur.fetchall()
    return rows

def load_transition_stats(conn):
    cur = conn.cursor()
    cur.execute("""
      SELECT from_stage, to_stage, count
      FROM flow_transition_stats
    """)
    return cur.fetchall()

def build_tensor(anchor_rows):
    xs = []
    for a, shown, clicked, ctr in anchor_rows:
        xs.append([
            shown / 100.0,
            clicked / 100.0,
            ctr,
        ])
    return torch.tensor(xs, dtype=torch.float32)
