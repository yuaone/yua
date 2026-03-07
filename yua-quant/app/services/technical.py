"""
TechnicalAnalyzer - RSI, MACD, Bollinger Bands, SMA, EMA
Uses pandas-ta for calculation.
"""

import pandas as pd
import pandas_ta as ta
from typing import Optional


def compute_indicators(
    df: pd.DataFrame,
    indicators: Optional[list[str]] = None,
) -> list[dict]:
    """Compute technical indicators and return signal interpretations."""
    if indicators is None:
        indicators = ["RSI", "MACD", "BB", "SMA", "EMA"]

    results = []
    close = df["Close"]

    for ind in indicators:
        ind_upper = ind.upper()

        if ind_upper == "RSI":
            rsi = ta.rsi(close, length=14)
            if rsi is not None and len(rsi) > 0:
                val = float(rsi.iloc[-1])
                signal = (
                    "oversold" if val < 30
                    else "overbought" if val > 70
                    else "neutral"
                )
                results.append({
                    "name": "RSI(14)",
                    "value": round(val, 2),
                    "signal": signal,
                    "description": _rsi_desc(val, signal),
                })

        elif ind_upper == "MACD":
            macd_df = ta.macd(close, fast=12, slow=26, signal=9)
            if macd_df is not None and len(macd_df) > 0:
                macd_val = float(macd_df.iloc[-1, 0])  # MACD line
                signal_val = float(macd_df.iloc[-1, 2])  # Signal line
                histogram = float(macd_df.iloc[-1, 1])  # Histogram

                if len(macd_df) >= 2:
                    prev_hist = float(macd_df.iloc[-2, 1])
                    if prev_hist < 0 and histogram > 0:
                        signal = "bullish_cross"
                    elif prev_hist > 0 and histogram < 0:
                        signal = "bearish_cross"
                    elif histogram > 0:
                        signal = "bullish"
                    else:
                        signal = "bearish"
                else:
                    signal = "bullish" if histogram > 0 else "bearish"

                results.append({
                    "name": "MACD(12,26,9)",
                    "value": round(macd_val, 4),
                    "signal": signal,
                    "description": _macd_desc(macd_val, signal_val, signal),
                })

        elif ind_upper == "BB":
            bb = ta.bbands(close, length=20, std=2)
            if bb is not None and len(bb) > 0:
                upper = float(bb.iloc[-1, 0])  # upper band
                mid = float(bb.iloc[-1, 1])    # middle band
                lower = float(bb.iloc[-1, 2])  # lower band
                current = float(close.iloc[-1])

                if current < lower:
                    signal = "below_lower"
                elif current > upper:
                    signal = "above_upper"
                else:
                    signal = "within_bands"

                width = (upper - lower) / mid * 100 if mid > 0 else 0
                results.append({
                    "name": "Bollinger Bands(20,2)",
                    "value": round(width, 2),
                    "signal": signal,
                    "description": _bb_desc(current, upper, lower, signal),
                })

        elif ind_upper == "SMA":
            for period in [20, 50, 200]:
                sma = ta.sma(close, length=period)
                if sma is not None and len(sma) > 0 and not pd.isna(sma.iloc[-1]):
                    val = float(sma.iloc[-1])
                    current = float(close.iloc[-1])
                    signal = "above" if current > val else "below"
                    results.append({
                        "name": f"SMA({period})",
                        "value": round(val, 2),
                        "signal": signal,
                        "description": f"현재가가 SMA({period}) {'위' if signal == 'above' else '아래'}에 위치",
                    })

        elif ind_upper == "EMA":
            for period in [12, 26]:
                ema = ta.ema(close, length=period)
                if ema is not None and len(ema) > 0 and not pd.isna(ema.iloc[-1]):
                    val = float(ema.iloc[-1])
                    current = float(close.iloc[-1])
                    signal = "above" if current > val else "below"
                    results.append({
                        "name": f"EMA({period})",
                        "value": round(val, 2),
                        "signal": signal,
                        "description": f"현재가가 EMA({period}) {'위' if signal == 'above' else '아래'}에 위치",
                    })

    return results


def generate_summary(info: dict, indicators: list[dict]) -> str:
    """Generate a concise analysis summary for LLM consumption."""
    name = info.get("name", "")
    price = info.get("currentPrice", 0)
    prev = info.get("previousClose", 0)

    change = price - prev
    pct = (change / prev * 100) if prev > 0 else 0

    bullish = sum(1 for i in indicators if i.get("signal") in ("bullish", "bullish_cross", "oversold", "above", "below_lower"))
    bearish = sum(1 for i in indicators if i.get("signal") in ("bearish", "bearish_cross", "overbought", "below", "above_upper"))

    if bullish > bearish:
        bias = "매수 우위"
    elif bearish > bullish:
        bias = "매도 우위"
    else:
        bias = "중립"

    return (
        f"{name} 현재가 {price:,.0f} ({'+' if change >= 0 else ''}{pct:.2f}%). "
        f"기술적 지표 {len(indicators)}개 중 매수 {bullish}개, 매도 {bearish}개 → {bias} 판단."
    )


# --- Description helpers ---

def _rsi_desc(val: float, signal: str) -> str:
    if signal == "oversold":
        return f"RSI {val:.1f}: 과매도 구간 (30 미만). 반등 가능성 주시."
    elif signal == "overbought":
        return f"RSI {val:.1f}: 과매수 구간 (70 초과). 조정 가능성 주시."
    return f"RSI {val:.1f}: 중립 구간."


def _macd_desc(macd: float, signal: float, sig: str) -> str:
    if sig == "bullish_cross":
        return "MACD 골든크로스 발생. 상승 추세 전환 신호."
    elif sig == "bearish_cross":
        return "MACD 데드크로스 발생. 하락 추세 전환 신호."
    elif sig == "bullish":
        return f"MACD({macd:.4f}) > Signal({signal:.4f}): 상승 추세 유지."
    return f"MACD({macd:.4f}) < Signal({signal:.4f}): 하락 추세 유지."


def _bb_desc(current: float, upper: float, lower: float, signal: str) -> str:
    if signal == "below_lower":
        return f"현재가({current:,.0f})가 하단 밴드({lower:,.0f}) 아래. 과매도 가능."
    elif signal == "above_upper":
        return f"현재가({current:,.0f})가 상단 밴드({upper:,.0f}) 위. 과매수 가능."
    return f"현재가가 밴드 내 위치. 밴드폭으로 변동성 판단."
