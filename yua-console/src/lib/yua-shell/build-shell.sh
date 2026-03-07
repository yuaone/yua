#!/bin/bash
set -e

echo "🟪 Building YUA Shell (TypeScript → JS)"

SHELL_DIR="/yua/runtime/yua-shell"

mkdir -p "$SHELL_DIR/dist"

# TypeScript compile
tsc -p "$SHELL_DIR/tsconfig.shell.json"

echo "✅ YUA Shell build complete"
