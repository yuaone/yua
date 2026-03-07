import sys
import json
import torch
import torch.nn as nn
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "decision_risk_v2.pt"

class DecisionRiskMLP(nn.Module):
    def __init__(self, input_dim: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.net(x)

def main():
    features = json.loads(sys.argv[1])
    x = torch.tensor([features], dtype=torch.float32)

    saved = torch.load(MODEL_PATH, map_location="cpu")
    model = DecisionRiskMLP(saved["input_dim"])
    model.load_state_dict(saved["model_state"])
    model.eval()

    with torch.no_grad():
        risk = float(model(x).item())

    print(json.dumps({
        "risk": risk
    }))

if __name__ == "__main__":
    main()
