#!/usr/bin/env python3
"""Inject the soft access gate into the bundled index.html.

Safe to re-run: any previously injected gate is stripped first, so this can be
applied to a freshly exported bundle on every deploy.

Usage:  python3 tools/apply-gate.py [index.html]
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GATE_JS = ROOT / "tools" / "gate.js"
HASH_FILE = ROOT / "tools" / "password.hash"

START = "<!-- __GATE_START__ -->"
END = "<!-- __GATE_END__ -->"
HOOK = "await window.__gate(); /* __GATE_HOOK__ */\n  "

# The bundler replaces the whole document at runtime, so the gate must block
# the unpack itself rather than overlay the finished page.
ANCHOR = "document.addEventListener('DOMContentLoaded', async function() {\n  "


def main() -> int:
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "index.html"

    if not HASH_FILE.exists():
        sys.exit("No tools/password.hash found. Run: python3 tools/set-password.py")

    pw_hash = HASH_FILE.read_text().strip()
    if not re.fullmatch(r"[0-9a-f]{64}", pw_hash):
        sys.exit(f"tools/password.hash is not a SHA-256 hex digest: {pw_hash!r}")

    html = target.read_text(encoding="utf-8")

    # Strip a previously injected gate so the script is idempotent.
    html = re.sub(re.escape(START) + ".*?" + re.escape(END), "", html, flags=re.S)
    html = html.replace(HOOK, "")

    if html.count("</head>") != 1:
        sys.exit("Expected exactly one literal </head> in the bundle.")
    if html.count(ANCHOR) != 1:
        sys.exit("Bundler DOMContentLoaded anchor not found — the export format changed.")

    gate = GATE_JS.read_text(encoding="utf-8").replace("__PASSWORD_HASH__", pw_hash)
    block = f"{START}\n<script>\n{gate}</script>\n{END}\n"

    html = html.replace("</head>", block + "</head>", 1)
    html = html.replace(ANCHOR, ANCHOR + HOOK, 1)

    target.write_text(html, encoding="utf-8")
    print(f"Gate applied to {target.relative_to(ROOT)} (hash {pw_hash[:12]}…)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
