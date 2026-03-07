import torch
import torch.nn as nn

class DecisionMLP(nn.Module):
    def __init__(self, input_dim, hidden=64):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden),
            nn.ReLU(),
            nn.Linear(hidden, 3)  # APPROVE / REJECT / HOLD
        )

    def forward(self, x):
        return self.net(x)
