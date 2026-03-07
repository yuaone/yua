# src/py/market/market_data_solver.py
# 🔒 SSOT: Market Data Solver (STATE BASED)
# - PY는 조회 + 상태만 반환 (판단 ❌)
# - exact 날짜는 존재하지 않을 수 있다
# - exact + ±1 거래일 fetch 후 "동일 날짜 + 2개 이상 소스 일치(quorum)"면 OK
# - 하드코딩 ❌ (단, weekend/기본 달력 판정은 시장 공통 규칙)

import sys
import time
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple

from .polygon_client import fetch_polygon
from .kis_client import fetch_kis
from .fmp_client import fetch_fmp
from .symbol_resolver import resolve_symbols
from ..event.solve_event_pattern import solve_event_pattern


MarketBar = Dict[str, float]  # keep loose: timestamp/open/high/low/close/volume


# -----------------------------
# helpers
# -----------------------------

def _iso_from_ts_ms(ts_ms: int) -> str:
    return datetime.fromtimestamp(ts_ms / 1000).date().isoformat()


def _is_weekend(iso_day: str) -> bool:
    d = date.fromisoformat(iso_day)
    return d.weekday() >= 5  # 5=Sat, 6=Sun


def _date_window_exact(center_iso: str) -> Tuple[str, str]:
    """exact fetch window: center ± 1 day (calendar)"""
    d = date.fromisoformat(center_iso)
    return (d - timedelta(days=1)).isoformat(), (d + timedelta(days=1)).isoformat()


def _filter_bars_by_day(bars: List[Dict], iso_day: str) -> List[Dict]:
    out: List[Dict] = []
    for b in bars or []:
        try:
            if _iso_from_ts_ms(int(b["timestamp"])) == iso_day:
                out.append(b)
        except Exception:
            continue
    return out


def _pick_daily_bar(bars: List[Dict]) -> Optional[Dict]:
    """
    Polygon/KIS는 1일 1바 형태가 보통이지만,
    혹시 중복이 들어오면 '마지막'을 선택 (timestamp 최신)
    """
    if not bars:
        return None
    bars_sorted = sorted(bars, key=lambda x: int(x.get("timestamp", 0)))
    return bars_sorted[-1]


def _close_key(bar: Dict) -> Optional[float]:
    try:
        return float(bar.get("close"))  # strict
    except Exception:
        return None


def _approx_equal(a: float, b: float, rel: float = 1e-6, abs_eps: float = 1e-4) -> bool:
    # 가격 비교는 float rounding/공급원 차이를 감안해 아주 약하게 허용
    diff = abs(a - b)
    if diff <= abs_eps:
        return True
    denom = max(abs(a), abs(b), 1.0)
    return (diff / denom) <= rel


def _quorum_close(per_source_bar: Dict[str, Dict]) -> Tuple[bool, Optional[float], List[str]]:
    """
    quorum = "동일 날짜"에서 2개 이상의 소스가
    close 값을 사실상 동일하게 제공하면 OK.
    """
    items: List[Tuple[str, float]] = []
    for src, bar in per_source_bar.items():
        c = _close_key(bar)
        if c is None:
            continue
        items.append((src, c))

    if len(items) < 2:
        return (False, items[0][1] if len(items) == 1 else None, [items[0][0]] if len(items) == 1 else [])

    # pairwise로 2개 이상 일치하면 quorum OK
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if _approx_equal(items[i][1], items[j][1]):
                agreed = [items[i][0], items[j][0]]
                # agreed close는 평균으로 (동일 수준이므로)
                return (True, (items[i][1] + items[j][1]) / 2.0, agreed)

    # 2개 이상인데 서로 안 맞으면 -> DELAYED(불일치)
    return (False, None, [src for src, _ in items])


def _debug_print(enabled: bool, *args):
    if not enabled:
        return
    print(*args, file=sys.stderr)


# -----------------------------
# source fetchers (market-specific)
# -----------------------------

def _fetch_us_sources(symbol: str, start: str, end: str, debug: bool) -> Dict[str, List[Dict]]:
    """
    NASDAQ/US: polygon + fmp를 모두 호출해서 quorum 후보 확보
    """
    out: Dict[str, List[Dict]] = {}

    # polygon
    try:
        out["polygon"] = fetch_polygon(symbol, start, end) or []
    except Exception as e:
        _debug_print(debug, "[MARKET_SOLVER][FETCH_ERROR]", {"symbol": symbol, "source": "polygon", "err": str(e)})

    # fmp (주의: fetch_fmp는 전체를 가져오므로 solver가 start/end 필터링)
    try:
        out["fmp"] = fetch_fmp(symbol, start, end) or []
    except Exception as e:
        _debug_print(debug, "[MARKET_SOLVER][FETCH_ERROR]", {"symbol": symbol, "source": "fmp", "err": str(e)})

    return out


def _fetch_kr_sources(symbol: str, start: str, end: str, debug: bool) -> Dict[str, List[Dict]]:
    out: Dict[str, List[Dict]] = {}
    try:
        out["kis"] = fetch_kis(symbol, start, end) or []
    except Exception as e:
        _debug_print(debug, "[MARKET_SOLVER][FETCH_ERROR]", {"symbol": symbol, "source": "kis", "err": str(e)})
    return out


# -----------------------------
# main solver
# -----------------------------

def solve_market_data(query: str, options: dict):
    symbols = options.get("symbols") or []
    start = options.get("start")
    end = options.get("end")
    date_kind = options.get("dateKind")  # exact | range | year | None
    debug = options.get("debug") is True

    with_events = options.get("withEvents") is True
    horizons = options.get("horizons", ["T+1", "T+5"])

    as_of = int(time.time() * 1000)

    if not start or not end:
        return {
            "count": 0,
            "results": [],
            "status": "ERROR",
            "reason": "start/end missing",
            "asOf": as_of,
        }

    # 🔒 FUTURE 판정 (end 기준)
    today = date.today()
    try:
        end_date = date.fromisoformat(end)
    except Exception:
        end_date = today

    if end_date > today and date_kind != "exact":
        # SSOT: 미래인데 exact 아니면 추정 상태
        return {
            "count": 0,
            "results": [],
            "status": "FUTURE",
            "reason": "요청 구간이 미래를 포함합니다. 아직 확정 종가가 존재하지 않습니다.",
            "asOf": as_of,
        }

    resolved = resolve_symbols(symbols)
    if not resolved:
        # SSOT: PY는 상태 반환도 가능하지만, 여기서는 명시 에러로 올림(상위에서 처리 가능)
        raise ValueError("NO_RESOLVED_SYMBOLS")

    results: List[Dict] = []

    # -----------------------------
    # EXACT (quorum + ±1 day)
    # -----------------------------
    if date_kind == "exact":
        target_day = start  # tool-plan-builder가 exact는 start=end=raw로 준다고 했음

        # future exact는 "FUTURE"로
        if date.fromisoformat(target_day) > today:
            return {
                "count": 0,
                "results": [],
                "status": "FUTURE",
                "reason": "요청한 날짜가 아직 도래하지 않았습니다.",
                "asOf": as_of,
            }

        # weekend면 거래일 아닐 가능성이 매우 높음 → NO_DATA로 정직하게
        if _is_weekend(target_day):
            # 다만 "±1 거래일" 규칙은 fetch는 하되, target_day 확정은 불가
            # (사용자가 exact라면 그 날짜 숫자는 내면 안 됨)
            pass

        win_start, win_end = _date_window_exact(target_day)

        for r in resolved:
            symbol = r["symbol"]
            market = r["market"]

            # 1) fetch multi-source
            if market == "NASDAQ":
                fetched = _fetch_us_sources(symbol, win_start, win_end, debug)
            elif market in ("KOSPI", "KOSDAQ"):
                fetched = _fetch_kr_sources(symbol, win_start, win_end, debug)
            else:
                # GLOBAL은 fmp만 (quorum 불가 → 단일소스면 DELAYED)
                fetched = {}
                try:
                    fetched["fmp"] = fetch_fmp(symbol, win_start, win_end) or []
                except Exception as e:
                    _debug_print(debug, "[MARKET_SOLVER][FETCH_ERROR]", {"symbol": symbol, "source": "fmp", "err": str(e)})

            # 2) normalize: per-source target day bar
            per_source_bar: Dict[str, Dict] = {}
            neighbor_any = False

            for src, bars in fetched.items():
                # fetch_fmp는 전체를 가져오므로 win 범위 밖도 있을 수 있어도 괜찮음 (필터로 걸러짐)
                target_bars = _filter_bars_by_day(bars, target_day)
                bar = _pick_daily_bar(target_bars)
                if bar:
                    per_source_bar[src] = bar

                # neighbor 존재 여부(±1) 확인 (target missing 시 상태 설명에 도움)
                if not neighbor_any:
                    for neigh in (win_start, win_end):
                        if _filter_bars_by_day(bars, neigh):
                            neighbor_any = True
                            break

            # 3) status 결정 (quorum)
            unique_sources = list(per_source_bar.keys())
            quorum_ok, quorum_close, quorum_sources = _quorum_close(per_source_bar)

            same_day_bars: List[Dict] = []
            if per_source_bar:
                # bars는 "target date bar 1개"만 내보내는 게 SSOT에 가장 안전
                # (UI/TS 소비가 simplest, 환각 위험 최소)
                # quorum_close가 있으면 close를 quorum 값으로 override(아주 약한 float 보정)
                best_src = quorum_sources[0] if quorum_sources else unique_sources[0]
                chosen = dict(per_source_bar[best_src])
                if quorum_close is not None:
                    chosen["close"] = float(quorum_close)
                same_day_bars = [chosen]

            if quorum_ok and same_day_bars:
                status = "OK"
                reason = None
                sources = quorum_sources
            elif len(unique_sources) == 1 and same_day_bars:
                status = "DELAYED"
                reason = "단일 소스에서만 확인되었습니다. 다른 공급원 확정 반영을 기다리는 구간일 수 있습니다."
                sources = unique_sources
            elif len(unique_sources) >= 2 and not same_day_bars:
                # 여러 소스를 봤는데 target가 비어있음
                status = "NO_DATA"
                if _is_weekend(target_day):
                    reason = "해당 날짜는 주말로 거래일이 아닐 가능성이 큽니다."
                else:
                    reason = "해당 날짜의 거래 데이터가 아직 공급/확정되지 않았습니다."
                sources = list(set([k for k in fetched.keys()]))
            else:
                # 아예 못 찾음
                status = "NO_DATA"
                if _is_weekend(target_day):
                    reason = "해당 날짜는 주말로 거래일이 아닐 가능성이 큽니다."
                elif neighbor_any:
                    reason = "인접 거래일 데이터는 보이지만, 요청 날짜는 아직 확정 반영이 안 된 상태입니다."
                else:
                    reason = "해당 날짜의 거래 데이터가 확인되지 않습니다."
                sources = list(set([k for k in fetched.keys()]))

            _debug_print(debug, "[MARKET_SOLVER][EXACT_STATUS]", {
                "symbol": symbol,
                "market": market,
                "target": target_day,
                "window": [win_start, win_end],
                "per_source": list(per_source_bar.keys()),
                "status": status,
                "sources": sources,
                "bars": len(same_day_bars),
            })

            # 4) events (optional): exact는 bar 1개라 events 불가
            event_patterns = None
            if with_events and same_day_bars and len(same_day_bars) >= 60:
                # practically unreachable in exact mode
                event_result = solve_event_pattern(query, {"bars": same_day_bars, "horizons": horizons})
                event_patterns = event_result.get("patternsByHorizon")

            results.append({
                "symbol": symbol,
                "market": market,
                "status": status,
                "bars": same_day_bars,
                "source": sources,
                "reason": reason,
                "asOf": as_of,
                "eventPatterns": event_patterns,
            })

        return {"count": len(results), "results": results}

    # -----------------------------
    # RANGE / YEAR / DEFAULT (series)
    # - 여기서는 quorum 대신 "커버리지 기반 상태"
    # -----------------------------
    for r in resolved:
        symbol = r["symbol"]
        market = r["market"]

        if market == "NASDAQ":
            fetched = _fetch_us_sources(symbol, start, end, debug)
        elif market in ("KOSPI", "KOSDAQ"):
            fetched = _fetch_kr_sources(symbol, start, end, debug)
        else:
            fetched = {}
            try:
                fetched["fmp"] = fetch_fmp(symbol, start, end) or []
            except Exception as e:
                _debug_print(debug, "[MARKET_SOLVER][FETCH_ERROR]", {"symbol": symbol, "source": "fmp", "err": str(e)})

        # 병합: range는 다량 bar가 필요하니,
        # 가장 bar 많은 소스를 기준으로 내보냄 (환각 방지: 숫자는 bar 자체가 사실)
        best_src = None
        best_bars: List[Dict] = []
        for src, bars in fetched.items():
            if len(bars or []) > len(best_bars):
                best_src = src
                best_bars = bars or []

        if not best_src:
            status = "NO_DATA"
            reason = "해당 기간의 거래 데이터가 확인되지 않습니다."
            sources = []
            bars_out = []
        else:
            sources = list(set(fetched.keys()))
            bars_out = sorted(best_bars, key=lambda x: int(x.get("timestamp", 0)))

            # 커버리지 판정
            if len(bars_out) > 0:
                status = "OK"
                reason = None
                # 다만 여러 소스 중 하나라도 비면 "DELAYED"로 강등할지 여부:
                # SSOT상 "일부만 있으면 DELAYED"가 자연스러움.
                if len(sources) >= 2:
                    # 소스가 2개 이상인데 한쪽이 비면 공급 불완전으로 delayed
                    empties = [s for s, b in fetched.items() if not b]
                    if empties:
                        status = "DELAYED"
                        reason = "일부 공급원에서 동일 기간 데이터가 아직 완전하지 않을 수 있습니다."
            else:
                status = "NO_DATA"
                reason = "해당 기간에는 거래 데이터가 확인되지 않습니다."

        event_patterns = None
        if with_events and bars_out and len(bars_out) >= 60:
            event_result = solve_event_pattern(query, {"bars": bars_out, "horizons": horizons})
            event_patterns = event_result.get("patternsByHorizon")

        _debug_print(debug, "[MARKET_SOLVER][SERIES_STATUS]", {
            "symbol": symbol,
            "market": market,
            "start": start,
            "end": end,
            "status": status,
            "sources": sources,
            "bars": len(bars_out),
        })

        results.append({
            "symbol": symbol,
            "market": market,
            "status": status,
            "bars": bars_out,
            "source": sources,
            "reason": reason,
            "asOf": as_of,
            "eventPatterns": event_patterns,
        })

    return {"count": len(results), "results": results}
