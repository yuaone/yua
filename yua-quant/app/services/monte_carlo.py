"""
Monte Carlo Simulation for stock price prediction.
"""

import numpy as np
import pandas as pd


def run_simulation(
    df: pd.DataFrame,
    horizon_days: int = 30,
    num_simulations: int = 1000,
) -> dict:
    """Run Monte Carlo simulation based on historical returns."""
    close = df["Close"].dropna()
    if len(close) < 10:
        raise ValueError("Not enough data points for simulation")

    # Calculate daily log returns
    log_returns = np.log(close / close.shift(1)).dropna()
    mu = log_returns.mean()
    sigma = log_returns.std()
    current_price = float(close.iloc[-1])

    # Simulate
    rng = np.random.default_rng()
    simulated_returns = rng.normal(mu, sigma, size=(num_simulations, horizon_days))
    price_paths = current_price * np.exp(np.cumsum(simulated_returns, axis=1))

    final_prices = price_paths[:, -1]

    # Calculate max drawdown per simulation
    running_max = np.maximum.accumulate(price_paths, axis=1)
    drawdowns = (price_paths - running_max) / running_max
    max_drawdowns = drawdowns.min(axis=1)

    prob_up = float(np.mean(final_prices > current_price))

    return {
        "simulations": num_simulations,
        "horizonDays": horizon_days,
        "currentPrice": round(current_price, 2),
        "results": {
            "mean": round(float(np.mean(final_prices)), 2),
            "median": round(float(np.median(final_prices)), 2),
            "p5": round(float(np.percentile(final_prices, 5)), 2),
            "p25": round(float(np.percentile(final_prices, 25)), 2),
            "p75": round(float(np.percentile(final_prices, 75)), 2),
            "p95": round(float(np.percentile(final_prices, 95)), 2),
            "probUp": round(prob_up, 4),
            "probDown": round(1 - prob_up, 4),
            "maxDrawdown": round(float(np.mean(max_drawdowns)) * 100, 2),
        },
    }


def generate_summary(ticker: str, result: dict) -> str:
    r = result["results"]
    current = result["currentPrice"]
    days = result["horizonDays"]
    mean_ret = (r["mean"] - current) / current * 100

    return (
        f"{ticker} {days}일 Monte Carlo ({result['simulations']}회): "
        f"평균 예상가 {r['mean']:,.0f} ({'+' if mean_ret >= 0 else ''}{mean_ret:.1f}%), "
        f"상승확률 {r['probUp']*100:.1f}%, "
        f"95% 범위 [{r['p5']:,.0f} ~ {r['p95']:,.0f}], "
        f"평균 최대낙폭 {r['maxDrawdown']:.1f}%."
    )
