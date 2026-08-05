#!/usr/bin/env bash
# Publish the current bundle from main, with the access gate re-applied.
#
# Run from the gh-pages branch. Takes index.html from main verbatim (so a fresh
# Claude Design export needs no hand-editing), injects the gate, and pushes.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ "$(git branch --show-current)" != "gh-pages" ]; then
  echo "Run this from the gh-pages branch:  git checkout gh-pages" >&2
  exit 1
fi

git checkout main -- index.html
python3 tools/apply-gate.py

if git diff --quiet -- index.html; then
  echo "No change — nothing to deploy."
  exit 0
fi

git add index.html
git commit -q -m "Deploy: refresh bundle from main and re-apply access gate"
git push -q origin gh-pages
echo "Deployed → https://andres-alegria.github.io/MRI_25_Anniversary/"
