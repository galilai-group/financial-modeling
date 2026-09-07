FROM python:3.12-slim-bookworm@sha256:782412e85d0f0984994c290652577d4018aff08145c85b262bb63dc0c7522254
ENV PYTHONDONTWRITEBYTECODE=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /environment
COPY requirements.lock /environment/requirements.lock
RUN python -m pip install --no-cache-dir --require-hashes --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.lock
RUN mkdir -p /data /submission /output /evaluator /work
COPY smoke_test.py /environment/smoke_test.py
RUN python /environment/smoke_test.py
WORKDIR /work
USER 65534:65534
CMD ["python"]
