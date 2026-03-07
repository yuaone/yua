#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo "🛠 Build KRX symbols via OpenDART"
python3 py/scripts/build_krx_csv.py

echo "✅ KRX symbol 갱신 완료"
  