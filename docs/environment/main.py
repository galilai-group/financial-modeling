"""Starter contract: replace this synthetic task with the challenge's approved data."""

import os
from pathlib import Path

import torch

# Read the organizer-provided dataset under this directory. Never download data.
data = Path(os.environ.get("TRAIN_DATA", "./data"))
output = Path(os.environ.get("MODEL_OUTPUT", "./model.pt"))
torch.manual_seed(0)
x = torch.randn(64, 4)
y = x.sum(dim=1, keepdim=True)
model = torch.nn.Linear(4, 1)
optimizer = torch.optim.SGD(model.parameters(), lr=0.05)
for _ in range(100):
    optimizer.zero_grad()
    loss = torch.nn.functional.mse_loss(model(x), y)
    loss.backward()
    optimizer.step()
# The destination file is precreated by the runner. Write directly to it;
# do not replace/rename it or create siblings in /output.
torch.jit.script(model.eval()).save(str(output))
print(f"Training finished; loss={loss.item():.6f}")
