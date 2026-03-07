"""
Pydantic schemas matching yua-shared/quant/quant-types.ts (SSOT mirror)
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional


class ScreenFilters(BaseModel):
    market: Optional[Literal["KRX", "KOSPI", "KOSDAQ", "US"]] = None
    min_volume: Optional[int] = Field(None, alias="minVolume")
    rsi_below: Optional[float] = Field(None, alias="rsiBelow")
    rsi_above: Optional[float] = Field(None, alias="rsiAbove")


class QuantRequest(BaseModel):
    action: Literal["analyze", "forecast", "simulate", "risk", "screen"]
    ticker: str
    period: str = "6mo"
    indicators: Optional[list[str]] = None
    forecast_days: int = Field(30, alias="forecastDays")
    simulations: int = 1000
    screen_filters: Optional[ScreenFilters] = Field(None, alias="screenFilters")

    model_config = {"populate_by_name": True}


DISCLAIMER = (
    "본 분석은 AI 기반 자동 생성 결과이며 투자 권유가 아닙니다. "
    "투자 판단의 책임은 사용자에게 있으며, 실제 투자 전 전문가 상담을 권장합니다."
)
