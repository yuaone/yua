import os
import requests
from typing import List
from .types import MarketBar


def fetch_fmp(
    symbol: str,
    start: str,
    end: str,
) -> List[MarketBar]:

    url = "https://financialmodelingprep.com/stable/historical-price-eod/full"
    r = requests.get(
        url,
        params={
            "symbol": symbol,
            "apikey": os.environ["FMP_API_KEY"],
        },
        timeout=30,
    )
    r.raise_for_status()

    data = r.json()
    bars: List[MarketBar] = []

    for d in data:
        bars.append({
            "timestamp": int(
                __import__("datetime")
                .datetime.fromisoformat(d["date"])
                .timestamp() * 1000
            ),
            "open": float(d["open"]),
            "high": float(d["high"]),
            "low": float(d["low"]),
            "close": float(d["close"]),
            "volume": float(d["volume"]),
        })

    bars.sort(key=lambda x: x["timestamp"])
    return bars
