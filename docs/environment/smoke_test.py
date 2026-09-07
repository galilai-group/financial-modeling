"""Organizer-owned checks; no participant code or network access needed."""

import importlib
import importlib.metadata
import tempfile
from pathlib import Path

import numpy as np
import onnx
import onnxruntime
import torch
import torchvision
from sklearn.linear_model import LogisticRegression

for module in ("stable_pretraining", "stable_worldmodel"):
    importlib.import_module(module)

for name in (
    "torch",
    "torchvision",
    "stable-pretraining",
    "stable-worldmodel",
    "scikit-learn",
    "onnx",
    "onnxruntime",
):
    print(name, importlib.metadata.version(name))
torch.manual_seed(0)
x = torch.randn(64, 4)
y = x.sum(1, keepdim=True)
model = torch.nn.Linear(4, 1)
optimizer = torch.optim.SGD(model.parameters(), lr=0.1)
for _ in range(100):
    optimizer.zero_grad()
    loss = torch.nn.functional.mse_loss(model(x), y)
    loss.backward()
    optimizer.step()
assert loss.item() < 1e-5
with tempfile.TemporaryDirectory() as directory:
    path = Path(directory) / "model.pt"
    torch.jit.script(model.eval()).save(str(path))
    restored = torch.jit.load(str(path))
    torch.testing.assert_close(restored(x), model(x))
    onnx_path = Path(directory) / "model.onnx"
    torch.onnx.export(
        model, x[:1], str(onnx_path), input_names=["input"], output_names=["output"], dynamo=False
    )
    onnx.checker.check_model(onnx.load(str(onnx_path)))
    session = onnxruntime.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    np.testing.assert_allclose(
        session.run(None, {"input": x[:1].numpy()})[0], model(x[:1]).detach().numpy(), atol=1e-5
    )
classifier = LogisticRegression().fit([[0, 0], [0, 1], [1, 0], [1, 1]], [0, 0, 1, 1])
assert classifier.predict([[0, 0], [1, 1]]).tolist() == [0, 1]
assert torchvision.ops.nms(torch.tensor([[0.0, 0.0, 1.0, 1.0]]), torch.tensor([1.0]), 0.5).tolist() == [0]
print(
    "PASS: imports, PyTorch training, TorchScript round-trip, ONNX inference, sklearn, torchvision compiled ops"
)
