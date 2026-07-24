# -*- coding: utf-8 -*-
"""Smoke test for mojibake helpers (no Django DB)."""
from apps.common.mojibake import fix_mojibake, looks_mojibake

cases = [
    # (input, expected_fixed or None)
    ("M\u00c3\u00a9nage", "M\u00e9nage"),
    ("R\u00c3\u00a9paration", "R\u00e9paration"),
    ("D\u00c3\u00a9m\u00c3\u00a9nagement", "D\u00e9m\u00e9nagement"),
    ("Nettoyage & M\u00c3\u00a9nage", "Nettoyage & M\u00e9nage"),
    ("OK normal", None),
    ("M\u00e9nage", None),  # already correct
]

failed = 0
for raw, expected in cases:
    got = fix_mojibake(raw)
    ok = got == expected
    if not ok:
        failed += 1
    print(
        f"{'OK' if ok else 'FAIL'}: "
        f"in={[hex(ord(c)) for c in raw]} "
        f"got={got!r} expected={expected!r} looks={looks_mojibake(raw)}"
    )

raise SystemExit(failed)
