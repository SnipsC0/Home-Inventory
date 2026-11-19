#!/usr/bin/env bash
# Publish a GitHub release for the version in manifest.json, attaching dist/home_inventory.zip.
# Env: PUBLISH=true to really publish (CI sets it only on push to main); anything else is a dry run.
# Needs: gh CLI + GH_TOKEN when publishing, git history with tags (fetch-depth: 0).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ZIP="$ROOT/dist/home_inventory.zip"
PY="$(command -v python || command -v python3)"

VERSION="$("$PY" -c "import json,sys; print(json.load(open(sys.argv[1]))['version'])" "$ROOT/custom_components/home_inventory/manifest.json")"
TAG="v$VERSION"
echo "Version: $VERSION  Tag: $TAG  Publish: ${PUBLISH:-false}"

# Notes = body of the '## ... <version> ...' section of CHANGELOG.md, up to the next '## ' heading.
NOTES="$(awk -v v="$VERSION" '
  /^## / { if (found) exit; if (index($0, " " v " ") || $0 ~ (" " v "$")) { found=1; next } }
  found { print }
' "$ROOT/CHANGELOG.md")"
if ! grep -qE "^## .* ${VERSION//./\\.}( |$)" "$ROOT/CHANGELOG.md"; then
  echo "ERROR: CHANGELOG.md has no section for $VERSION" >&2
  exit 1
fi

[ -f "$ZIP" ] || { echo "ERROR: $ZIP not found, build it first" >&2; exit 1; }

if git -C "$ROOT" ls-remote --exit-code --tags origin "refs/tags/$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists: nothing to publish."
  exit 0
fi

SHA="$(git -C "$ROOT" rev-parse HEAD)"

# PR that introduced this commit: GitHub API first, then a "(#N)" in the commit subject.
PR_NUMBER="$(gh api "repos/{owner}/{repo}/commits/$SHA/pulls" --jq '.[0].number // empty' 2>/dev/null || true)"
# gh prints the error body on stdout when the call fails: accept digits only.
case "$PR_NUMBER" in ''|*[!0-9]*) PR_NUMBER="" ;; esac
if [ -z "$PR_NUMBER" ]; then
  PR_NUMBER="$(git -C "$ROOT" log -1 --format=%s "$SHA" | grep -oE '\(#[0-9]+\)' | tail -1 | tr -dc '0-9' || true)"
fi
if [ -n "$PR_NUMBER" ]; then
  NOTES="$NOTES

---
Changes: PR #$PR_NUMBER"
fi

if [ "${PUBLISH:-false}" != "true" ]; then
  echo "DRY RUN: would create tag+release $TAG with $(basename "$ZIP") and notes:"
  echo "-----"; echo "$NOTES"; echo "-----"
  exit 0
fi

NOTES_FILE="$(mktemp)"
trap 'rm -f "$NOTES_FILE"' EXIT
printf '%s\n' "$NOTES" > "$NOTES_FILE"
gh release create "$TAG" "$ZIP" --target "$SHA" --title "$TAG" --notes-file "$NOTES_FILE"
echo "Published $TAG"
