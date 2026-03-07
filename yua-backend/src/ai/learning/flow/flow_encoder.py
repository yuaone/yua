import torch
import torch.nn as nn

class FlowEncoder(nn.Module):
    def __init__(self, input_dim=3, hidden_dim=32):
        super().__init__()
        self.gru = nn.GRU(input_dim, hidden_dim, batch_first=True)
        self.head = nn.Linear(hidden_dim, 1)

    def forward(self, x):
        _, h = self.gru(x)
        out = self.head(h.squeeze(0))
        return torch.tanh(out)
