# 🔒 Chemistry Solver (SSOT)
# - stoichiometry
# - reaction balancing

from typing import Dict, Any, List
from sympy import Matrix, symbols
import re


def solve_chemistry(query: str, options: Dict[str, Any]) -> Dict[str, Any]:
    q = query.replace(" ", "")
    want_steps = options.get("wantSteps", True)
    steps: List[str] = []

    # Example: H2 + O2 -> H2O
    if "->" not in q:
        raise ValueError("Reaction format: A + B -> C")

    left, right = q.split("->")
    reactants = left.split("+")
    products = right.split("+")

    def parse(compound):
        return re.findall(r"([A-Z][a-z]*)(\d*)", compound)

    elements = set()
    for c in reactants + products:
        for el,_ in parse(c):
            elements.add(el)
    elements = list(elements)

    cols = reactants + products
    matrix = []

    for el in elements:
        row = []
        for c in reactants:
            cnt = sum(int(n or 1) for e,n in parse(c) if e==el)
            row.append(cnt)
        for c in products:
            cnt = sum(int(n or 1) for e,n in parse(c) if e==el)
            row.append(-cnt)
        matrix.append(row)

    M = Matrix(matrix)
    sol = M.nullspace()[0]
    coeffs = sol / min(sol)

    steps.append("Balanced reaction")

    return {
        "final": {
            compound: int(coeffs[i])
            for i, compound in enumerate(cols)
        },
        "value": None,
        "steps": steps,
    }
