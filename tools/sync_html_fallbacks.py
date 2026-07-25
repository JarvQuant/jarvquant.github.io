#!/usr/bin/env python3
"""Sync the static HTML text with the English i18n strings.

Why this exists
---------------
Every translatable element carries ``data-i18n="key"``. i18n.js rewrites
those at runtime, so a visitor with JavaScript always sees the current
copy. Crawlers that don't execute JS — notably GPTBot and most AI
scrapers — only ever see whatever literal text sits in index.html.

Those two drifted apart: index.html still held an early poetic draft
("Enter the archive.") while i18n.js had the real, descriptive copy
("The gap between theory and real market experience. Closed."). Search
engines and LLMs were therefore indexing the weakest version of the site.

This script rewrites the literal text of simple, text-only elements to
match the English strings, so the served HTML and the rendered page say
the same thing. Run it whenever the English copy changes.

    python tools/sync_html_fallbacks.py [--check]

--check exits non-zero if anything is out of sync (useful pre-deploy).
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = ["index.html", "compare.html"]
I18N = ROOT / "i18n.js"


def load_en_strings() -> dict[str, str]:
    """Extract the English key/value pairs from i18n.js."""
    src = I18N.read_text(encoding="utf-8")
    # The EN block runs from `en: {` to the start of the next language key.
    m = re.search(r"\ben\s*:\s*\{(.*?)\n\s{0,4}\},?\s*\n\s{0,4}[a-z]{2}\s*:", src, re.S)
    block = m.group(1) if m else src
    out: dict[str, str] = {}
    for key, val in re.findall(r'"([\w.]+)"\s*:\s*"((?:[^"\\]|\\.)*)"', block):
        out[key] = json.loads(f'"{val}"')
    return out


def sync_file(path: Path, strings: dict[str, str], *, check: bool) -> list[str]:
    """Return the list of keys whose HTML text differed from the EN string."""
    src = path.read_text(encoding="utf-8")
    drifted: list[str] = []

    def replace(match: re.Match) -> str:
        opening, key, inner, closing = match.groups()
        want = strings.get(key)
        if want is None:
            return match.group(0)
        # Only touch text-only elements — never rewrite nested markup.
        if "<" in inner:
            return match.group(0)
        if inner.strip() == html.escape(want, quote=False).strip():
            return match.group(0)
        drifted.append(key)
        if check:
            return match.group(0)
        return f"{opening}{html.escape(want, quote=False)}{closing}"

    pattern = re.compile(
        r"(<(?:h1|h2|h3|p|div|span|li|button|a)\b[^>]*\bdata-i18n=\"([\w.]+)\"[^>]*>)"
        r"(.*?)"
        r"(</(?:h1|h2|h3|p|div|span|li|button|a)>)",
        re.S,
    )
    new = pattern.sub(replace, src)
    if not check and new != src:
        path.write_text(new, encoding="utf-8")
    return drifted


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="report drift, change nothing")
    args = ap.parse_args()

    strings = load_en_strings()
    print(f"Loaded {len(strings)} English strings from i18n.js")

    total: list[str] = []
    for name in HTML_FILES:
        p = ROOT / name
        if not p.exists():
            continue
        drifted = sync_file(p, strings, check=args.check)
        total += drifted
        verb = "out of sync" if args.check else "updated"
        print(f"  {name}: {len(drifted)} {verb}")
        for k in drifted:
            print(f"      {k}")

    if args.check and total:
        print("\nHTML text differs from the English copy — run without --check.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
