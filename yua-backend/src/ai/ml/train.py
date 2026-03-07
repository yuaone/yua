# YUA PHASE 5 — Decision Risk Model Training
# - Rule을 절대 대체하지 않음
# - 실패 확률 (risk) 예측 전용
# - CPU default / GPU event-only

import os
import psycopg2
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from pathlib import Path

# -----------------------------
# Config (SSOT)
# -----------------------------
DB_URL = os.environ.get("DATABASE_URL")
USE_GPU = os.environ.get("USE_GPU", "false").lower() == "true"

DEVICE = (
    "cuda"
    if USE_GPU and torch.cuda.is_available()
    else "cpu"
)

EPOCHS = 10
BATCH_SIZE = 32
LR = 1e-3

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"
MODEL_DIR.mkdir(exist_ok=True)
MODEL_PATH = MODEL_DIR / "decision_risk_v2.pt"

print(f"[YUA TRAIN] device = {DEVICE}")

# -----------------------------
# Model (Ultra-light DL)
# -----------------------------
class DecisionRiskMLP(nn.Module):
    def __init__(self, input_dim: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid()   # failure probability
        )

    def forward(self, x):
        return self.net(x)

# -----------------------------
# Data Loader (SSOT)
# -----------------------------
def load_training_data():
    if not DB_URL:
        raise RuntimeError("DATABASE_URL not set")

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # 🔒 SSOT: judgment_failures = ground truth
    cur.execute("""
        SELECT
          confidence,
          type,
          stage,
          path,
          corrected_path
        FROM judgment_failures
        WHERE created_at >= NOW() - INTERVAL '30 days'
          AND corrected_path IS NOT NULL
    """)

    xs, ys = [], []

    for confidence, ftype, stage, path, corrected in cur.fetchall():
        # -------- Feature Vector (stable, cheap) --------
        x = [
            float(confidence or 0),
            1 if ftype == "hard" else 0,
            1 if ftype == "soft" else 0,
            1 if stage == "capability" else 0,
            1 if path != corrected else 0,
        ]

        # -------- Label --------
        # 1 = Rule 판단 실패
        y = 1 if path != corrected else 0

        xs.append(x)
        ys.append(y)

    cur.close()
    conn.close()

    if not xs:
        raise RuntimeError("No training samples")

    return (
        torch.tensor(xs, dtype=torch.float32),
        torch.tensor(ys, dtype=torch.float32).unsqueeze(1),
    )

# -----------------------------
# Train
# -----------------------------
def train():
    x, y = load_training_data()

    dataset = TensorDataset(x, y)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    model = DecisionRiskMLP(x.shape[1]).to(DEVICE)
    opt = torch.optim.Adam(model.parameters(), lr=LR)
    loss_fn = nn.BCELoss()

    for epoch in range(EPOCHS):
        total_loss = 0.0
        for bx, by in loader:
            bx, by = bx.to(DEVICE), by.to(DEVICE)

            opt.zero_grad()
            pred = model(bx)
            loss = loss_fn(pred, by)
            loss.backward()
            opt.step()

            total_loss += loss.item()

        print(f"[epoch {epoch+1}] loss={total_loss/len(loader):.4f}")

    torch.save(
        {
            "model_state": model.state_dict(),
            "input_dim": x.shape[1],
        },
        MODEL_PATH,
    )

    print(f"[YUA TRAIN] saved -> {MODEL_PATH}")

if __name__ == "__main__":
    train()
