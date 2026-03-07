import os
import json
import time
import requests
from pathlib import Path
from typing import List
from .types import MarketBar


_TOKEN_CACHE = Path(".kis_token.json")


def _get_token() -> str:
    if _TOKEN_CACHE.exists():
        cached = json.loads(_TOKEN_CACHE.read_text())
        if time.time() < cached["expires_at"]:
            return cached["access_token"]

    url = f"{os.environ['KIS_BASE_URL']}/oauth2/tokenP"
    payload = {
        "grant_type": "client_credentials",
        "appkey": os.environ["KIS_APP_KEY"],
        "appsecret": os.environ["KIS_APP_SECRET"],
    }

    r = requests.post(url, json=payload, timeout=30)
    r.raise_for_status()
    token = r.json()["access_token"]

    _TOKEN_CACHE.write_text(json.dumps({
        "access_token": token,
        "expires_at": time.time() + 6 * 60 * 60,
    }))

    return token


def fetch_kis(
    symbol: str,
    start: str,
    end: str,
) -> List[MarketBar]:

    token = _get_token()

    url = (
        f"{os.environ['KIS_BASE_URL']}"
        "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice"
    )

    headers = {
        "authorization": f"Bearer {token}",
        "appkey": os.environ["KIS_APP_KEY"],
        "appsecret": os.environ["KIS_APP_SECRET"],
        "tr_id": "FHKST03010100",
    }

    params = {
        "FID_COND_MRKT_DIV_CODE": "J",
        "FID_INPUT_ISCD": symbol,
        "FID_INPUT_DATE_1": start.replace("-", ""),
        "FID_INPUT_DATE_2": end.replace("-", ""),
        "FID_PERIOD_DIV_CODE": "D",
        "FID_ORG_ADJ_PRC": "0",
    }

    r = requests.get(url, headers=headers, params=params, timeout=30)
    r.raise_for_status()
    rows = r.json().get("output2", [])

    bars: List[MarketBar] = []

    for r in rows:
        bars.append({
            "timestamp": int(time.mktime(
                time.strptime(r["stck_bsop_date"], "%Y%m%d")
            )) * 1000,
            "open": float(r["stck_oprc"]),
            "high": float(r["stck_hgpr"]),
            "low": float(r["stck_lwpr"]),
            "close": float(r["stck_clpr"]),
            "volume": float(r["acml_vol"]),
        })

    bars.sort(key=lambda x: x["timestamp"])
    return bars
