#!/bin/bash
# No-op: pnpm with node-linker=hoisted handles EAS builds correctly.
# The expo-modules-core patch fixes the components.release Gradle crash.
echo "=== EAS Build Pre-Install (no-op) ==="
echo "Node: $(node --version)"
echo "=== Done ==="
