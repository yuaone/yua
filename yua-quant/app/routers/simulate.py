"""POST /quant/simulate - Monte Carlo Simulation"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import QuantRequest, DISCLAIMER
from app.services.market_data import fetch_history, resolve_ticker
from app.services.monte_carlo import run_simulation, generate_summary

router = APIRouter()


@router.post("/simulate")
async def simulate(req: QuantRequest):
    try:
        ticker = resolve_ticker(req.ticker)
        df = fetch_history(ticker, req.period)
        sims = min(req.simulations, 10000)  # cap at 10k
        days = min(req.forecast_days, 90)

        result = run_simulation(df, horizon_days=days, num_simulations=sims)
        result["ticker"] = ticker
        summary = generate_summary(ticker, result)

        return {
            "ok": True,
            "action": "simulate",
            "data": {**result, "summary": summary},
            "disclaimer": DISCLAIMER,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
