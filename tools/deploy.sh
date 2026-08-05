#!/usr/bin/env bash
# Re-apply the access gate to index.html and publish.
#
# Run this after dropping a fresh Claude Design export over index.html: the
# export overwrites the gate, and this puts it back before pushing.
set -euo pipefail

cd "$(dirname "$0")/.."

BRANCH="$(git branch --show-current)"
if [ "$BRANCH" != "main" ]; then
  echo "Expected to be on main, but currently on '$BRANCH'." >&2
  exit 1
fi

python3 tools/apply-gate.py

if git diff --quiet -- index.html; then
  echo "No change — nothing to deploy."
  exit 0
fi

git add index.html
git commit -q -m "Deploy: refresh bundle and re-apply access gate"
git push -q origin main
echo "Deployed → https://andres-alegria.github.io/MRI_25_Anniversary/"
