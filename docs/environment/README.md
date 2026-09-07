# Stable Challenge reference environment

Python 3.12, Linux x86_64, CPU. Includes PyTorch 2.8.0, torchvision 0.23.0,
stable-pretraining 0.1.8, stable-worldmodel 0.1.1 (training and data-format extras),
scikit-learn 1.7.2, NumPy, Lightning, transformers, ONNX and ONNX Runtime.
Simulator/Atari/robotics extras and pretrained weights are not bundled.
All resolved Python dependencies and artifact hashes are in `requirements.lock`.
The base Python image is pinned by digest in `Dockerfile`.

Download this directory from the challenge repository, or export it locally:

```sh
stable-challenge training-env training-environment
cd training-environment
```

For local development (your own code, not a security sandbox):

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install --require-hashes --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.lock
.venv/bin/python smoke_test.py
mkdir -p data
TRAIN_DATA=./data MODEL_OUTPUT=./model.pt .venv/bin/python main.py
```

For the organizer's verification worker:

```sh
podman build -t stable-challenge-training:0.1 .
# Or: docker build -t stable-challenge-training:0.1 .
```

Image build runs the same smoke test. Network access is needed only for environment
preparation, not verification. Do not install participant requirements or run a
participant Dockerfile. The organizer must review and prepare additional dependencies
in advance. Custom/GPU images need their own matching downloadable environment;
`--gpus` does not turn this CPU image into a CUDA image.

## Source contract

Upload a ZIP containing `main.py` at the root and its supporting source files.
Do not include `.venv`, caches, `.git`, pretrained weights, secrets, or datasets
unless the challenge rules explicitly permit the latter assets. Package checks
reject virtual environments, unsafe paths and links; they cannot determine whether
arbitrary source conceals prohibited data.

The organizer runs `python main.py` from a writable copy of your source. Read approved
training data from `os.environ['TRAIN_DATA']` (`/data`, read-only). Write your compiled
model directly to `os.environ['MODEL_OUTPUT']` (default `/output/model.pt`). That file
is precreated and is the only writable host file. Do not rename/replace it or write
siblings in `/output`. Temporary files belong in `/work` or `/tmp`, both size limited.
There is no network, interactive input, credential access or dependency installation.
The example uses synthetic data solely to illustrate this contract; replace it with
the actual challenge dataset and required model format.

The evaluator runs separately with `EVAL_DATA=/data`, the hidden evaluation directory.
Training code never receives that directory. The compiled output remains untrusted:
the evaluator also runs in a fresh offline container. Models must support the configured
format; arbitrary Python exports are not automatically safe to load on the host.

The default limits are 25 MiB ZIP, 250 MiB expanded, 2,000 ZIP entries, 200:1 maximum
per-file compression ratio, four CPU cores, 8 GiB memory, 128 processes and one hour.
Each challenge may override the published limits. GPU memory is not bounded by these
CPU-memory controls; GPU workers require dedicated allocation.

Successful source-derived metrics appear beside original model scores. A green check
means the source executed and its generated model was evaluated, not that scores match
or that the organizer has certified compliance with data rules. Public training failure
logs help you debug. Evaluation tracebacks remain private to avoid exposing hidden data.

The admin runner validates Python 3.12 and every pinned dependency version for this
reference environment before a verification job. In `--unsafe` mode the admin must
explicitly pass `--python /path/to/this/.venv/bin/python`; the CLI interpreter is never
silently substituted. Unsafe mode is host execution, not a sandbox.
