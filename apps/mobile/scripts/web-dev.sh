#!/usr/bin/env bash
# Expo web dev with TMPDIR workaround for Metro cache EACCES on /tmp.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT/.expo/tmp"
export TMPDIR="$ROOT/.expo/tmp"
cd "$ROOT"
exec pnpm exec expo start --web --port "${PORT:-8081}"
