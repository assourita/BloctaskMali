#!/usr/bin/env python3
"""Fail if any tracked .py file under backend/apps is not valid UTF-8."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APPS = ROOT / "apps"

errors: list[str] = []
for path in sorted(APPS.rglob("*.py")):
    raw = path.read_bytes()
    try:
        raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        rel = path.relative_to(ROOT)
        errors.append(f"{rel}: {exc}")

if errors:
    print("UTF-8 encoding errors:")
    for line in errors:
        print(f"  - {line}")
    sys.exit(1)

print(f"OK: {sum(1 for _ in APPS.rglob('*.py'))} Python files are valid UTF-8")
