"""POST /quant/risk - Risk Analysis"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import QuantRequest, DISCLAIMER
from app.services.market_data import fetch_history, resolve_ticker
from app.services.risk_analysis import analyze_risk, generate_summary

router = APIRouter()


@router.post("/risk")
async def risk(req: QuantRequest):
    try:
        ticker = resolve_ticker(req.ticker)
        df = fetch_history(ticker, req.period)
        risk_data = analyze_risk(df, req.period)
        summary = generate_summary(ticker, risk_data, req.period)

        return {
            "ok": True,
            "action": "risk",
            "data": {
                "ticker": ticker,
                "period": req.period,
                **risk_data,
                "summary": summary,
            },
            "disclaimer": DISCLAIMER,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk analysis failed: {str(e)}")
