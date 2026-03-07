#!/usr/bin/env python3
# 🔒 SSOT: KRX Symbol Builder via OpenDART
# - HTML 스크랩 ❌
# - CSV 다운로드 ❌
# - 공식 API only ✅

import csv
import os
import sys
import requests
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "py" / "data" / "krx_symbols.csv"

DART_API_KEY = os.environ.get("DART_API_KEY")
if not DART_API_KEY:
    print("❌ DART_API_KEY not set", file=sys.stderr)
    sys.exit(1)

LIST_URL = "https://opendart.fss.or.kr/api/corpCode.xml"

MARKET_MAP = {
    "Y": "KOSPI",
    "K": "KOSDAQ",
}

def main():
    print("📥 Fetching corp list from OpenDART")

    r = requests.get(
        LIST_URL,
        params={"crtfc_key": DART_API_KEY},
        timeout=30,
    )
    r.raise_for_status()

    import zipfile, io, xml.etree.ElementTree as ET

    z = zipfile.ZipFile(io.BytesIO(r.content))
    xml_name = z.namelist()[0]

    tree = ET.fromstring(z.read(xml_name))

    rows = []

    for corp in tree.findall("list"):
        corp_name = corp.findtext("corp_name")
        stock_code = corp.findtext("stock_code")
        market = corp.findtext("corp_cls")

        if not corp_name or not stock_code:
            continue

        market_norm = MARKET_MAP.get(market)
        if not market_norm:
            continue

        rows.append({
            "symbol": stock_code.zfill(6),
            "name": corp_name.strip(),
            "market": market_norm,
        })

    if not rows:
        print("❌ No KRX symbols parsed", file=sys.stderr)
        sys.exit(1)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["symbol", "name", "market"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"✅ generated {len(rows)} rows → {OUTPUT}")

if __name__ == "__main__":
    main()
