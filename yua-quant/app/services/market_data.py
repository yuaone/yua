"""
MarketDataFetcher - yfinance + pykrx 연동
캐시: 메모리 TTL (Phase 1), Redis (Phase 2)
"""

import time
import yfinance as yf
import pandas as pd
from typing import Optional

# Simple in-memory cache with TTL
_cache: dict[str, tuple[float, pd.DataFrame]] = {}
_CACHE_TTL = 300  # 5 minutes


def _cache_key(ticker: str, period: str) -> str:
    return f"{ticker}:{period}"


def fetch_history(ticker: str, period: str = "6mo") -> pd.DataFrame:
    """Fetch OHLCV history for a ticker."""
    key = _cache_key(ticker, period)
    now = time.time()

    if key in _cache:
        ts, df = _cache[key]
        if now - ts < _CACHE_TTL:
            return df.copy()

    t = yf.Ticker(ticker)
    df = t.history(period=period, auto_adjust=True)

    if df.empty:
        raise ValueError(f"No data found for ticker: {ticker}")

    _cache[key] = (now, df.copy())
    return df


def fetch_info(ticker: str) -> dict:
    """Fetch basic stock info."""
    t = yf.Ticker(ticker)
    info = t.info or {}
    return {
        "name": info.get("shortName") or info.get("longName") or ticker,
        "currency": info.get("currency", "KRW"),
        "currentPrice": info.get("currentPrice") or info.get("regularMarketPrice") or 0,
        "previousClose": info.get("previousClose") or 0,
        "volume": info.get("volume") or info.get("regularMarketVolume") or 0,
        "marketCap": info.get("marketCap") or 0,
    }


def resolve_ticker(ticker: str) -> str:
    """Normalize ticker format.
    - Korean stock codes: 005930 -> 005930.KS
    - Already formatted: return as-is
    """
    if ticker.isdigit() and len(ticker) == 6:
        return f"{ticker}.KS"
    return ticker
