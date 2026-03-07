"""POST /quant/forecast - Statistical Forecasting (Phase 1: simple moving average + trend)"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import QuantRequest, DISCLAIMER
from app.services.market_data import fetch_history, resolve_ticker
import numpy as np
import pandas as pd

router = APIRouter()


@router.post("/forecast")
async def forecast(req: QuantRequest):
    """Phase 1: Linear trend + volatility band forecast.
    Phase 2 will add ARIMA/Prophet.
    """
    try:
        ticker = resolve_ticker(req.ticker)
        df = fetch_history(ticker, req.period)
        close = df["Close"].dropna()

        if len(close) < 20:
            raise ValueError("Not enough data for forecasting")

        # Simple linear regression on recent data
        n = len(close)
        x = np.arange(n)
        y = close.values

        # Fit linear trend
        coeffs = np.polyfit(x, y, 1)
        slope, intercept = coeffs

        # Daily volatility
        returns = close.pct_change().dropna()
        daily_vol = float(returns.std())

        # Generate predictions
        days = min(req.forecast_days, 90)
        predictions = []
        last_date = df.index[-1]
        current = float(close.iloc[-1])

        for i in range(1, days + 1):
            pred_date = last_date + pd.Timedelta(days=i)
            # Skip weekends
            while pred_date.weekday() >= 5:
                pred_date += pd.Timedelta(days=1)

            predicted = intercept + slope * (n + i)
            # Confidence interval widens with sqrt(time)
            ci = 1.96 * current * daily_vol * np.sqrt(i)

            predictions.append({
                "date": pred_date.strftime("%Y-%m-%d"),
                "predicted": round(float(predicted), 2),
                "lower": round(float(predicted - ci), 2),
                "upper": round(float(predicted + ci), 2),
            })

        # MAPE on last 20% as validation
        val_size = max(int(n * 0.2), 5)
        val_x = x[-val_size:]
        val_y = y[-val_size:]
        val_pred = intercept + slope * val_x
        mape = float(np.mean(np.abs((val_y - val_pred) / val_y)) * 100)

        final_pred = predictions[-1]["predicted"] if predictions else current
        change_pct = (final_pred - current) / current * 100

        summary = (
            f"{ticker} {days}일 추세 예측: "
            f"현재 {current:,.0f} → 예상 {final_pred:,.0f} "
            f"({'+' if change_pct >= 0 else ''}{change_pct:.1f}%). "
            f"모델: Linear Trend (MAPE {mape:.1f}%). "
            f"일일 변동성 {daily_vol*100:.2f}%."
        )

        return {
            "ok": True,
            "action": "forecast",
            "data": {
                "ticker": ticker,
                "model": "LinearTrend",
                "forecastDays": days,
                "predictions": predictions,
                "accuracy": {
                    "mape": round(mape, 2),
                },
                "summary": summary,
            },
            "disclaimer": DISCLAIMER,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast failed: {str(e)}")
