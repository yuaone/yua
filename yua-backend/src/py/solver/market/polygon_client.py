import os
import requests
from typing import List
from .types import MarketBar


def fetch_polygon(
    symbol: str,
    start: str,
    end: str,
) -> List[MarketBar]:

    url = f"https://api.polygon.io/v2/aggs/ticker/{symbol}/range/1/day/{start}/{end}"

    r = requests.get(
        url,
        params={
            "adjusted": "true",
            "sort": "asc",
            "apiKey": os.environ["POLYGON_API_KEY"],
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()

    results = data.get("results", [])
    bars: List[MarketBar] = []

    for d in results:
        bars.append({
            "timestamp": int(d["t"]),
            "open": float(d["o"]),
            "high": float(d["h"]),
            "low": float(d["l"]),
            "close": float(d["c"]),
            "volume": float(d["v"]),
        })

    return bars
