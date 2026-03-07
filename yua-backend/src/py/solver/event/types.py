# 🔒 Event Pattern Types (SSOT)

from typing import TypedDict, List, Dict


class DailyBar(TypedDict):
    symbol: str
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: float


class EventOutcomeStats(TypedDict):
    mean_return: float
    std_return: float
    positive_ratio: float
    negative_ratio: float
    sample_size: int


class EventPatternResult(TypedDict):
    event_id: str
    horizon: str
    stats: EventOutcomeStats
