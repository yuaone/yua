from typing import TypedDict, List


class MarketBar(TypedDict):
    timestamp: int      # epoch ms
    open: float
    high: float
    low: float
    close: float
    volume: float


class MarketDataResult(TypedDict):
    symbol: str
    market: str         # NASDAQ | KOSPI | KOSDAQ
    bars: List[MarketBar]
    source: str         # polygon | kis | fmp
    fetched_at: int     # epoch ms
