#!/usr/bin/env python3
# 🔒 PY Solver Entry (SSOT)

import sys
import json
import time

import solver.bootstrap  # 반드시 먼저
from solver.dispatcher import dispatch

def main():
    start = time.time()
    try:
        raw = sys.stdin.read()
        req = json.loads(raw)

        query = req.get("query", "")
        options = req.get("options", {}) or {}

        name, solver = dispatch(query, options)
        result = solver(query, options)

        resp = {
            "ok": True,
            "result": result,
            "meta": {
                "solver": name,
                "latencyMs": int((time.time() - start) * 1000),
            },
            "error": None,
        }
    except Exception as e:
        resp = {
            "ok": False,
            "result": None,
            "meta": None,
            "error": str(e),
        }

    sys.stdout.write(json.dumps(resp, ensure_ascii=False))

if __name__ == "__main__":
    main()
