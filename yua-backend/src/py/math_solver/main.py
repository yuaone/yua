#!/usr/bin/env python3
# 🔒 PY Solver Entry (SSOT)

import sys
import json
import time

import solver               # ⭐ 이 줄이 registry를 채운다
from solver.dispatcher import dispatch
from solver.schema import SolverResponse


def main():
    start = time.time()

    try:
        raw = sys.stdin.read()
        req = json.loads(raw)

        query = req.get("query", "")
        options = req.get("options", {}) or {}

        solver_name, solver_fn = dispatch(query, options)
        result = solver_fn(query, options)

        resp: SolverResponse = {
            "ok": True,
            "result": result,
            "meta": {
                "engine": "sympy",
                "solver": solver_name,
                "latencyMs": int((time.time() - start) * 1000),
            },
            "error": None,
        }

    except Exception as e:
        resp: SolverResponse = {
            "ok": False,
            "result": None,
            "meta": None,
            "error": str(e),
        }

    sys.stdout.write(json.dumps(resp, ensure_ascii=False))


if __name__ == "__main__":
    main()
