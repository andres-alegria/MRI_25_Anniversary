#!/usr/bin/env bash
# Rebuild index.html from the pristine Claude Design export.
#
# The export lives in git history at BASE_REF rather than as a working file,
# so a rebuild never depends on a scratch copy surviving.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_REF="${BASE_REF:-d5abd7f}"   # export + access gate, before any wiring

if git show "$BASE_REF:index.html" | grep -q "__MRI_CONTENT_WIRED__"; then
  echo "BASE_REF $BASE_REF is already wired — it is not a pristine export." >&2
  exit 1
fi

git show "$BASE_REF:index.html" > index.html
python3 tools/apply-content.py
python3 tools/apply-gate.py
echo "Rebuilt from $BASE_REF."
