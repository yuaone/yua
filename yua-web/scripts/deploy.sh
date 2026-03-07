#!/usr/bin/env bash
# deploy.sh — Build yua-web and restart PM2 atomically.
#
# Usage:
#   ./scripts/deploy.sh          # build + restart
#   ./scripts/deploy.sh --skip-build   # restart only (use current .next)
#
# This script prevents the classic Next.js chunk-mismatch bug:
#   1. Old server references chunk hashes baked into its in-memory manifest
#   2. A new build replaces .next/ with new chunk hashes
#   3. The old server can't find the new chunks -> 404 -> text/html MIME errors
#
# Fix: always restart PM2 AFTER the build completes successfully.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$PROJECT_DIR")"

cd "$PROJECT_DIR"

SKIP_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
  esac
done

echo "[deploy] yua-web deploy started at $(date)"
echo "[deploy] project dir: $PROJECT_DIR"

# ── 1. Build ──────────────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  echo "[deploy] Running pnpm build..."
  cd "$REPO_ROOT"
  pnpm --filter yua-web build
  echo "[deploy] Build completed. BUILD_ID: $(cat "$PROJECT_DIR/.next/BUILD_ID")"
else
  echo "[deploy] Skipping build (--skip-build)"
fi

# ── 2. Restart PM2 ───────────────────────────────────────
echo "[deploy] Restarting PM2 yua-web..."
pm2 restart yua-web --update-env
sleep 2

# ── 3. Health check ──────────────────────────────────────
echo "[deploy] Running health check..."
HTTP_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || true)
if [ "$HTTP_STATUS" = "200" ]; then
  echo "[deploy] Health check passed (HTTP $HTTP_STATUS)"
else
  echo "[deploy] WARNING: Health check returned HTTP $HTTP_STATUS"
  echo "[deploy] Check: pm2 logs yua-web --lines 30"
  exit 1
fi

# ── 4. Verify a static chunk is served correctly ─────────
# Pick the webpack chunk from the build manifest (always exists)
WEBPACK_CHUNK=$(ls "$PROJECT_DIR/.next/static/chunks/webpack-"*.js 2>/dev/null | head -1 | xargs basename)
if [ -n "$WEBPACK_CHUNK" ]; then
  CHUNK_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:3000/_next/static/chunks/$WEBPACK_CHUNK" || true)
  if [ "$CHUNK_STATUS" = "200" ]; then
    echo "[deploy] Static asset check passed ($WEBPACK_CHUNK -> HTTP $CHUNK_STATUS)"
  else
    echo "[deploy] WARNING: Static asset returned HTTP $CHUNK_STATUS for $WEBPACK_CHUNK"
    exit 1
  fi
fi

echo "[deploy] Deploy completed successfully at $(date)"
