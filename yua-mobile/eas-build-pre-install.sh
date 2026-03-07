#!/bin/bash
set -e

# Force pnpm for monorepo build
corepack enable
corepack prepare pnpm@10.26.2 --activate

echo "pnpm version: $(pnpm --version)"
