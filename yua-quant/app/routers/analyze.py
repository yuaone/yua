"""POST /quant/analyze - Technical Analysis"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import QuantRequest, DISCLAIMER
from app.services.market_data import fetch_history, fetch_info, resolve_ticker
from app.services.technical import compute_indicators, generate_summary

router = APIRouter()


@router.post("/analyze")
async def analyze(req: QuantRequest):
    try:
        ticker = resolve_ticker(req.ticker)
        df = fetch_history(ticker, req.period)
        info = fetch_info(ticker)
        indicators = compute_indicators(df, req.indicators)
        summary = generate_summary(info, indicators)

        prev = info.get("previousClose", 0)
        price = info.get("currentPrice", 0)
        change = price - prev
        pct = (change / prev * 100) if prev > 0 else 0

        return {
            "ok": True,
            "action": "analyze",
            "data": {
                "ticker": ticker,
                "name": info.get("name"),
                "currency": info.get("currency"),
                "currentPrice": price,
                "change24h": round(change, 2),
                "changePercent24h": round(pct, 2),
                "volume": info.get("volume"),
                "marketCap": info.get("marketCap"),
                "indicators": indicators,
                "summary": summary,
                "dataPoints": len(df),
            },
            "disclaimer": DISCLAIMER,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
