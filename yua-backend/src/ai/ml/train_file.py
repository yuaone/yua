import json
import torch
import torch.nn as nn
from pathlib import Path
from model.decision_mlp import DecisionMLP

BASE_DIR = Path(__file__).resolve().parent
DATA = BASE_DIR / "dataset" / "samples.jsonl"

def load_data():
    if not DATA.exists():
        raise FileNotFoundError(f"Dataset not found: {DATA}")

    xs, ys = [], []

    with open(DATA, "r", encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)

            x = [
                r.get("confidence", 0),
                1 if r.get("softFailure") else 0,
                1 if r.get("hardFailure") else 0,
                1 if r.get("pathCorrected") else 0,
            ]

            if r.get("hardFailure"):
                y = 1  # REJECT
            elif r.get("softFailure"):
                y = 2  # HOLD
            else:
                y = 0  # APPROVE

            xs.append(x)
            ys.append(y)

    return torch.tensor(xs, dtype=torch.float32), torch.tensor(ys)

def train():
    x, y = load_data()

    model = DecisionMLP(x.size(1))
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()

    for epoch in range(20):
        opt.zero_grad()
        out = model(x)
        loss = loss_fn(out, y)
        loss.backward()
        opt.step()
        print(f"epoch {epoch} loss {loss.item():.4f}")

    torch.save(model.state_dict(), BASE_DIR / "decision_v1.pt")

if __name__ == "__main__":
    train()
