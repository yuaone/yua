from time import perf_counter

from fastapi import FastAPI

from .schemas import YuaMaxV1Input, YuaMaxV1Output
from .model import evaluate

app = FastAPI(title="yua-max-service", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/v1/evaluate", response_model=YuaMaxV1Output)
def evaluate_v1(payload: YuaMaxV1Input) -> YuaMaxV1Output:
    start = perf_counter()
    output = evaluate(payload, 0.0)
    latency_ms = (perf_counter() - start) * 1000.0
    output.latencyMs = latency_ms
    if not output.reasons:
        output.reasons = []
    return output
