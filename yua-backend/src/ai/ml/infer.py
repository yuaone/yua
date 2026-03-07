import torch
import torch.nn.functional as F
from model.decision_mlp import DecisionMLP
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "decision_v1.pt"

class DecisionInfer:
    def __init__(self, input_dim: int):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.model = DecisionMLP(input_dim).to(self.device)
        self.model.load_state_dict(
            torch.load(MODEL_PATH, map_location=self.device)
        )
        self.model.eval()

    @torch.no_grad()
    def predict(self, x):
        if not isinstance(x, torch.Tensor):
            x = torch.tensor([x], dtype=torch.float32)

        x = x.to(self.device)

        logits = self.model(x)
        probs = F.softmax(logits, dim=-1)[0]

        labels = ["APPROVE", "REJECT", "HOLD"]
        idx = int(torch.argmax(probs).item())

        return {
            "verdict": labels[idx],
            "confidence": float(probs[idx].item()),
            "distribution": {
                labels[i]: float(probs[i].item())
                for i in range(len(labels))
            }
        }
