# 🔒 Statistics Solver (SSOT — Safe)

from typing import Dict, Any, List
import math
import statistics as stats


def solve_statistics(query: str, options: Dict[str, Any]) -> Dict[str, Any]:
    q = query.strip().lower()
    want_steps = options.get("wantSteps", True)
    steps: List[str] = []

    def parse_list(text: str) -> List[float]:
        if "[" not in text or "]" not in text:
            raise ValueError("List required: [1,2,3]")
        body = text[text.index("[")+1:text.index("]")]
        data = [float(x.strip()) for x in body.split(",")]
        if len(data) < 2:
            raise ValueError("At least two data points required")
        return data

    # ---------- STD ----------
    if "std" in q or "표준편차" in q:
        data = parse_list(q)
        s = stats.stdev(data)
        steps += [f"data={data}", f"std={s}"]
        return {"final": str(s), "value": s, "steps": steps}

    # ---------- Z-SCORE ----------
    if "zscore" in q:
        data = parse_list(q)
        x = float(options.get("x"))
        m = stats.mean(data)
        sd = stats.stdev(data)

        if sd == 0:
            return {
                "final": None,
                "value": None,
                "steps": steps + ["Standard deviation is zero"],
            }

        z = (x - m) / sd
        steps += [f"mean={m}", f"std={sd}", f"z={z}"]
        return {"final": str(z), "value": z, "steps": steps}

    # ---------- CORRELATION ----------
    if "correlation" in q or "상관" in q:
        x = options.get("x")
        y = options.get("y")
        if not x or not y:
            raise ValueError("x and y required")

        if len(x) != len(y):
            raise ValueError("x and y must have same length")

        mx, my = stats.mean(x), stats.mean(y)
        num = sum((a-mx)*(b-my) for a, b in zip(x, y))
        den = math.sqrt(
            sum((a-mx)**2 for a in x) *
            sum((b-my)**2 for b in y)
        )

        if den == 0:
            return {
                "final": None,
                "value": None,
                "steps": ["Denominator is zero"],
            }

        r = num / den
        steps += [f"corr={r}"]
        return {"final": str(r), "value": r, "steps": steps}

    raise ValueError("Unsupported statistics query")
