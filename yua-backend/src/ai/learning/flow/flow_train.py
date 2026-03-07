import psycopg2
import torch
import torch.optim as optim
from flow_dataset import load_anchor_stats, build_tensor
from flow_encoder import FlowEncoder
from pathlib import Path

MODEL_DIR = Path(__file__).parent / "artifacts"
MODEL_DIR.mkdir(exist_ok=True)

def train():
    conn = psycopg2.connect(
        dbname="yua_ai",
        user="postgres",
        password="postgres",
        host="127.0.0.1"
    )

    anchor_rows = load_anchor_stats(conn)
    if not anchor_rows:
        print("No data, skip training")
        return

    x = build_tensor(anchor_rows).unsqueeze(0)

    model = FlowEncoder()
    opt = optim.Adam(model.parameters(), lr=1e-3)

    for epoch in range(30):
        opt.zero_grad()
        out = model(x)
        loss = -out.mean()  # 방향성 학습
        loss.backward()
        opt.step()

    torch.save(
        model.state_dict(),
        MODEL_DIR / "flow_bias_v1.pt"
    )

    print("Flow bias model saved")

if __name__ == "__main__":
    train()
