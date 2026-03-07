#!/bin/bash
# deploy-web.sh — Zero-downtime yua-web deploy
#
# 원리:
#   1. NEXT_BUILD_DIR=.next-build 으로 빌드 → 구 .next/ 는 건드리지 않음
#   2. 빌드 완료 후 .next/ ↔ .next-build/ swap
#   3. PM2 restart → 새 .next/ 서빙
#   4. 구 .next-old/ 는 2분 후 삭제
#
# 이렇게 하면:
#   - 빌드 중에도 기존 .next/ 가 그대로 서빙됨 → CSS/JS 안 깨짐
#   - swap + restart 순간만 1-2초 다운타임
#
# Usage: bash deploy-web.sh

set -e

ROOT="/home/dmsal020813/projects"
WEB="$ROOT/yua-web"

echo "========================================="
echo "  YUA-WEB Zero-Downtime Deploy"
echo "========================================="

# Step 1: Clean previous temp build
echo "[1/5] Preparing..."
rm -rf "$WEB/.next-build"
rm -rf "$WEB/.next-old"

# Step 2: Build to .next-build/ (live .next/ untouched)
echo "[2/5] Building to .next-build/ ..."
cd "$ROOT"
NEXT_BUILD_DIR=.next-build pnpm --filter yua-web build

# Step 3: Atomic swap
echo "[3/5] Swapping builds..."
if [ -d "$WEB/.next" ]; then
  mv "$WEB/.next" "$WEB/.next-old"
fi
mv "$WEB/.next-build" "$WEB/.next"

# Step 4: Restart
echo "[4/5] Restarting PM2..."
pm2 restart yua-web --update-env
sleep 3
pm2 show yua-web | grep -E "status|uptime" | head -2

# Step 5: Delayed cleanup
echo "[5/5] Old build cleanup in 2 min..."
(sleep 120 && rm -rf "$WEB/.next-old") &

BUILD_ID=$(cat "$WEB/.next/BUILD_ID" 2>/dev/null || echo "unknown")
echo ""
echo "=== Deploy Success ==="
echo "BUILD_ID: $BUILD_ID"
