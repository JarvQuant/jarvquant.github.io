#!/usr/bin/env python3
"""Writes the direct links of the legal pages: what a visitor still has when scripts or the API do not work.

    python tools/legal_direct.py                         rewrite the blocks (after changing this file)
    python tools/legal_direct.py --copy https://HOST     name the host of the static copy (backend/tools/legal_copy.py)
    python tools/legal_direct.py --copy none             no copy

Every page keeps, in its own HTML, links to the plain text on the API (works without scripts) and, once a copy exists, to
the copy (works without the API too). legal/legal.js gets the same host. The pages hold addresses of documents only, never
a detail of the operator except the project's public support address. tools/site_check.py checks the result.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
API = "https://jarvquant-api.onrender.com"
MAIL = "JarvQuant@gmail.com"
START, END = "<!-- legal-direct:start (tools/legal_direct.py) -->", "<!-- legal-direct:end -->"
# page -> (document type, German label, English label); None: a form
PAGES = {
    "impressum.html": [("imprint", "Impressum", "Imprint")],
    "datenschutz.html": [("privacy", "Datenschutz", "Privacy")],
    "agb.html": [("terms", "AGB", "Terms")],
    "widerrufsbelehrung.html": [("withdrawal_policy", "Widerrufsbelehrung", "Withdrawal policy"),
                                ("withdrawal_form", "Muster-Widerrufsformular", "Model withdrawal form")],
    "risikohinweise.html": [("risk", "Risikohinweise", "Risk notice")],
    "kuendigen.html": None, "widerrufen.html": None,
}
FORM_TEXT = {
    "kuendigen.html": ("Erscheint hier kein Formular oder lässt es sich nicht absenden, können Sie formlos per E-Mail "
                       "kündigen:", "If no form appears here or it cannot be sent, you can cancel informally by e-mail:"),
    "widerrufen.html": ("Erscheint hier kein Formular oder lässt es sich nicht absenden, können Sie Ihren Vertrag formlos "
                        "per E-Mail widerrufen:",
                        "If no form appears here or it cannot be sent, you can withdraw informally by e-mail:"),
}


def links(docs, host_path) -> str:
    out = []
    for doc, de, en in docs:
        out.append(f'<a href="{host_path}/{doc}.de.html" hreflang="de" rel="noopener">{de}</a>')
        out.append(f'<a href="{host_path}/{doc}.en.html" hreflang="en" rel="noopener">{en}</a>')
    return " · ".join(out)


def block(page: str, copy: str) -> str:
    docs = PAGES[page]
    lines = [START, '  <footer class="legal-direct">']
    if docs is None:
        de, en = FORM_TEXT[page]
        for text, lang in ((de, "de"), (en, "en")):
            lines.append(f'    <p lang="{lang}">{text} <a href="mailto:{MAIL}">{MAIL}</a></p>')
    else:
        if copy:
            lines.append(f'    <p>Direkt zum Text / plain text: {links(docs, copy)}</p>')
            lines.append(f'    <p>Zweiter Weg / second way: {links(docs, API + "/legal/pages")}</p>')
        else:
            lines.append(f'    <p>Direkt zum Text (ohne JavaScript) / plain text (no JavaScript): '
                         f'{links(docs, API + "/legal/pages")}</p>')
        lines.append(f'    <p>Kontakt / contact: <a href="mailto:{MAIL}">{MAIL}</a></p>')
    return "\n".join([*lines, "  </footer>", "  " + END])


def copy_host() -> str:
    m = re.search(r'^const COPY = "([^"]*)";', (ROOT / "legal/legal.js").read_text(encoding="utf-8"), re.M)
    if not m:
        raise SystemExit('legal/legal.js: no line const COPY = "..."; at the start of a line')
    return m.group(1)


def valid(host: str) -> bool:
    u = urlsplit(host)
    return (u.scheme == "https" and bool(u.hostname) and "." in u.hostname and not u.path and not u.query
            and not u.fragment and "@" not in u.netloc and u.hostname not in ("www.jarvquant.com", "jarvquant.com",
                                                                            urlsplit(API).hostname)
            and not u.hostname.endswith(".github.io"))


def save(path: Path, old: bytes, text: str) -> None:
    nl = b"\r\n" if b"\r\n" in old else b"\n"
    new = text.encode("utf-8").replace(b"\n", nl)
    if new != old:
        path.write_bytes(new)


def write(copy: str) -> None:
    for page in PAGES:
        p = ROOT / page
        raw = p.read_bytes()
        text = raw.decode("utf-8").replace("\r\n", "\n")
        new = block(page, copy)
        if START in text:
            text = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda _m: new, text, flags=re.S)
        else:
            mark = '  <script type="module" src="/legal/legal.js'
            if text.count(mark) != 1:
                raise SystemExit(f"{page}: no single place for the direct links")
            text = text.replace(mark, "  " + new + "\n" + mark)
        save(p, raw, text)
    p = ROOT / "legal/legal.js"
    raw = p.read_bytes()
    text = raw.decode("utf-8").replace("\r\n", "\n")
    save(p, raw, re.sub(r'^const COPY = "[^"]*";', f'const COPY = "{copy}";', text, count=1, flags=re.M))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--copy", help="https://HOST of the static copy, or none")
    args = ap.parse_args()
    copy = copy_host() if args.copy is None else ("" if args.copy == "none" else args.copy.rstrip("/"))
    if copy and not valid(copy):
        print("FAIL: --copy takes https://HOST (not this website, not the API, no path)")
        return 1
    write(copy)
    print("direct links written;", f"copy: {copy}" if copy else "no copy set")
    return 0


if __name__ == "__main__":
    sys.exit(main())
