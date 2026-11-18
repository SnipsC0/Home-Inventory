#!/usr/bin/env bash
# Build dist/home_inventory.zip (integration files at the zip root, as HACS zip_release expects).
# Usage: scripts/build_release_zip.sh [version]   (version only overrides manifest.json in the build copy)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/custom_components/home_inventory"
OUT="$ROOT/dist/home_inventory.zip"
VERSION="${1:-}"

(cd "$ROOT/frontend" && npm ci && npm run build)
[ -f "$SRC/panel/panel-wrapper.js" ] || { echo "panel-wrapper.js missing after build" >&2; exit 1; }

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -r "$SRC/." "$STAGE/"
find "$STAGE" -name '__pycache__' -type d -prune -exec rm -rf {} +
find "$STAGE" -name '*.pyc' -delete

PY="$(command -v python || command -v python3)"
"$PY" "$ROOT/scripts/make_zip.py" "$STAGE" "$OUT" "$VERSION"
