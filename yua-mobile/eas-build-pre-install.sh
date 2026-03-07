#!/bin/bash
set -e

echo "=== EAS Build Pre-Install ==="
echo "Node: $(node --version)"

# We are at monorepo root on EAS (/home/expo/workingdir/build/)

# 1. Replace pnpm workspace:* protocol with file: for npm compatibility
# yua-mobile/package.json has "yua-shared": "workspace:*"
cd yua-mobile
# Replace workspace protocol with file reference
sed -i 's/"yua-shared": "workspace:\*"/"yua-shared": "file:..\/yua-shared"/' package.json
# Remove packageManager field so EAS uses npm (not pnpm)
sed -i '/"packageManager"/d' package.json
echo "Patched yua-mobile/package.json for npm"
cd ..

# 2. Create root package.json with npm workspaces (if not exists or lacks workspaces)
cat > package.json << 'ROOTPKG'
{
  "name": "yua-monorepo",
  "private": true,
  "workspaces": ["yua-shared", "yua-mobile"]
}
ROOTPKG
echo "Created root package.json with npm workspaces"

# 3. Remove pnpm artifacts that conflict with npm
rm -f pnpm-lock.yaml pnpm-workspace.yaml .npmrc 2>/dev/null || true
rm -rf node_modules yua-mobile/node_modules yua-shared/node_modules 2>/dev/null || true

# 4. Install with npm (flat node_modules, no symlinks, Gradle-compatible)
npm install --legacy-peer-deps
echo "npm install complete"

echo "=== Pre-Install Done ==="
