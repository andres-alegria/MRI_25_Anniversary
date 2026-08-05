#!/usr/bin/env python3
"""Set the preview passphrase.

Prompts for the passphrase (never echoed, never passed as an argument, so it
stays out of shell history) and writes only its SHA-256 digest to
tools/password.hash. The passphrase itself is never stored in the repo.

Usage:  python3 tools/set-password.py
"""

import hashlib
from getpass import getpass
from pathlib import Path

HASH_FILE = Path(__file__).resolve().parent / "password.hash"


def main() -> int:
    pw = getpass("New passphrase: ")
    if len(pw) < 6:
        return print("Too short — use at least 6 characters.") or 1
    if pw != getpass("Confirm passphrase: "):
        return print("Passphrases did not match.") or 1

    digest = hashlib.sha256(pw.encode("utf-8")).hexdigest()
    HASH_FILE.write_text(digest + "\n", encoding="utf-8")

    print(f"Saved digest to {HASH_FILE.name}. Now run: python3 tools/apply-gate.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
