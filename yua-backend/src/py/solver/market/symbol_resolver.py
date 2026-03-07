# 🔒 SSOT: Symbol Resolver (LOOKUP ONLY)
# - 절대 판단 ❌
# - 절대 추론 ❌
# - lookup / normalize ONLY

from typing import Optional, Dict, List
import csv
import os
import requests
from pathlib import Path

FMP_SEARCH_URL = "https://financialmodelingprep.com/api/v3/search"

# src/py/solver/market/symbol_resolver.py
# → parents[3] = src/py
KRX_CSV = Path(__file__).resolve().parents[3] / "data" / "krx_symbols.csv"

_KRX_CACHE: Optional[Dict[str, Dict]] = None


# -----------------------------
# Internal helpers
# -----------------------------

def _normalize_market(raw: Optional[str]) -> str:
    if not raw:
        return "GLOBAL"
    r = raw.strip().upper()
    if r in ("KOSPI", "KOSDAQ", "KONEX"):
        return r
    if r in ("NASDAQ", "NYSE", "AMEX"):
        return "NASDAQ"
    return "GLOBAL"


def _load_krx_symbols() -> Dict[str, Dict]:
    """
    Load KRX CSV once and cache.
    Keys:
      - 회사명
      - 종목코드 (6자리)
    """
    global _KRX_CACHE

    if _KRX_CACHE is not None:
        return _KRX_CACHE

    mapping: Dict[str, Dict] = {}

    if not KRX_CSV.exists():
        _KRX_CACHE = mapping
        return mapping

    try:
        with KRX_CSV.open(encoding="utf-8") as f:
            reader = csv.DictReader(f)

            # CSV 헤더 자체가 이상한 경우 방어
            if not reader.fieldnames:
                _KRX_CACHE = mapping
                return mapping

            for r in reader:
                symbol = (r.get("symbol") or "").strip()
                name = (r.get("name") or "").strip()
                market = _normalize_market(r.get("market"))

                if not symbol or not name:
                    continue

                entry = {
                    "symbol": symbol,
                    "market": market,
                    "name": name,
                    "source": "krx_csv",
                }

                # 회사명 / 종목코드 모두 키로 등록
                mapping[name] = entry
                mapping[symbol] = entry

    except Exception:
        # 🔒 어떤 경우에도 resolver가 죽으면 안 됨
        mapping = {}

    _KRX_CACHE = mapping
    return mapping


# -----------------------------
# Public API
# -----------------------------

def resolve_symbol(symbol_hint: str) -> Optional[Dict]:
    """
    단일 힌트 → 단일 확정 결과
    """
    if not symbol_hint:
        return None

    symbol_hint = symbol_hint.strip()
    if not symbol_hint:
        return None

    # 🇰🇷 KRX CSV 우선 (회사명 / 종목코드)
    krx = _load_krx_symbols().get(symbol_hint)
    if krx:
        return krx

    # 🇺🇸 미국 티커 직접 (AAPL, NVDA 등)
    if (
        symbol_hint.isascii()
        and symbol_hint.isupper()
        and symbol_hint.isalpha()
        and 1 <= len(symbol_hint) <= 5
    ):
        return {
            "symbol": symbol_hint,
            "market": "NASDAQ",
            "name": symbol_hint,
            "source": "ticker_direct",
        }

    # 🌍 FMP 검색 (단일 결과만 허용)
    try:
        r = requests.get(
            FMP_SEARCH_URL,
            params={
                "query": symbol_hint,
                "limit": 5,
                "apikey": os.environ.get("FMP_API_KEY"),
            },
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()

        if isinstance(data, list) and len(data) == 1:
            d = data[0]
            return {
                "symbol": d.get("symbol"),
                "market": _normalize_market(d.get("exchangeShortName")),
                "name": d.get("name"),
                "source": "fmp_search",
            }

    except Exception:
        pass

    return None


def resolve_symbols(symbol_hints: List[str]) -> List[Dict]:
    """
    여러 종목 힌트 → 확정 가능한 것만 반환
    """
    if not symbol_hints:
        return []

    results: List[Dict] = []
    seen = set()

    for hint in symbol_hints:
        if not hint:
            continue

        r = resolve_symbol(hint)
        if not r:
            continue

        key = (r.get("symbol"), r.get("market"))
        if key in seen:
            continue

        seen.add(key)
        results.append(r)

    return results
