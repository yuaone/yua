"""
YUA Quant Service - Phase 1
FastAPI server for stock analysis, forecasting, and simulation.
"""

from fastapi import FastAPI
from app.routers import analyze, forecast, simulate, risk

app = FastAPI(
    title="YUA Quant Service",
    version="0.1.0",
)

app.include_router(analyze.router, prefix="/quant")
app.include_router(forecast.router, prefix="/quant")
app.include_router(simulate.router, prefix="/quant")
app.include_router(risk.router, prefix="/quant")


@app.get("/health")
async def health():
    return {"ok": True, "service": "yua-quant", "version": "0.1.0"}
