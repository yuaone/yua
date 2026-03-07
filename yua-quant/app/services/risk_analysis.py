"""
Risk Analysis - Volatility, VaR, Sharpe, Max Drawdown
"""

import numpy as np
import pandas as pd
from scipy import stats


def analyze_risk(df: pd.DataFrame, period: str = "6mo") -> dict:
    """Calculate risk metrics."""
    close = df["Close"].dropna()
    if len(close) < 10:
        raise ValueError("Not enough data for risk analysis")

    daily_returns = close.pct_change().dropna()

    # Annualized volatility
    volatility = float(daily_returns.std() * np.sqrt(252))

    # 95% Value at Risk (parametric)
    var_95 = float(np.percentile(daily_returns, 5))

    # Sharpe ratio (assuming risk-free rate = 3%)
    annual_return = float((close.iloc[-1] / close.iloc[0]) ** (252 / len(close)) - 1)
    sharpe = (annual_return - 0.03) / volatility if volatility > 0 else 0

    # Max drawdown
    running_max = close.cummax()
    drawdown = (close - running_max) / running_max
    max_drawdown = float(drawdown.min())

    return {
        "volatility": round(volatility * 100, 2),
        "sharpeRatio": round(sharpe, 3),
        "var95": round(var_95 * 100, 2),
        "maxDrawdown": round(max_drawdown * 100, 2),
        "annualReturn": round(annual_return * 100, 2),
        "dailyReturnMean": round(float(daily_returns.mean()) * 100, 4),
        "dailyReturnStd": round(float(daily_returns.std()) * 100, 4),
        "skewness": round(float(stats.skew(daily_returns)), 3),
        "kurtosis": round(float(stats.kurtosis(daily_returns)), 3),
    }


def generate_summary(ticker: str, risk: dict, period: str) -> str:
    vol = risk["volatility"]
    sharpe = risk["sharpeRatio"]
    var95 = risk["var95"]
    mdd = risk["maxDrawdown"]

    risk_level = "높음" if vol > 40 else "보통" if vol > 20 else "낮음"

    return (
        f"{ticker} ({period}) 리스크 분석: "
        f"연간 변동성 {vol:.1f}% ({risk_level}), "
        f"Sharpe {sharpe:.2f}, "
        f"일일 VaR(95%) {var95:.2f}%, "
        f"최대낙폭 {mdd:.1f}%."
    )
