#!/usr/bin/env python3
"""Checks the website's files for things that must never be in it. Exit code 1 when one is found.

    python tools/site_check.py

What it checks (owner rules for the partner area and the legal pages):
  telemetry   count.js stays "off"; no sendBeacon outside count.js, no /partner/click, no ref.js, no analytics or
              third-party script (two known ones are listed in ALLOWED_SCRIPTS and reported as notes)
  claims      no rate in any JSON-LD block, no "12 %" standard commission claim, none of the old thresholds or
              rates of the first partner page, no "guaranteed income" wording
  secrets     no PIN, code or token read from a query string, no localStorage or cookie in the partner area
  api base    the production API is the only API host; a local one only in the two files that choose it by hostname
  links       every local link and script/style source points to a file that exists; no /r/ link, no old partner
              imprint or privacy file; sitemap.xml, robots.txt and llms.txt name no removed path
  legal       the Phase B/C legal pages are all present and still load their documents
  indexing    every page that shows the operator's personal details says noindex in its initial HTML, is not blocked
              in robots.txt (the crawler must be able to read it) and is in no sitemap; the product pages stay
              indexable; no address or phone number in structured data or tel: links
  direct      every legal page has its text links in its own HTML (tools/legal_direct.py), the same copy host as legal.js,
              and something to read without scripts. With --release a missing copy host is a problem, not a note
Standard library only; run it from anywhere.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import legal_direct  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PROD_API = "https://jarvquant-api.onrender.com"
ALLOWED_SCRIPTS = {      # third-party scripts that exist outside the partner area; named so they stay a decision
    "discord-verify.html": "https://challenges.cloudflare.com/",
    "admin/index.html": "https://cdn.jsdelivr.net/npm/chart.js@",
}
LOCAL_API_FILES = {"legal/legal.js", "partner/partner.js"}
LEGAL_PAGES = ["impressum.html", "datenschutz.html", "agb.html", "widerrufsbelehrung.html", "widerrufen.html",
               "kuendigen.html", "risikohinweise.html", "bestaetigen.html", "legal/legal.js", "legal/legal.css"]
# Documents with the operator's name, address, e-mail or phone (backend/app/legal_templates). The page decides by its
# data-doc; ?lang=en and ?version=... are the same file, so one tag covers the English and the older versions.
PERSONAL_DOCS = {"imprint", "privacy", "terms", "withdrawal_policy", "withdrawal_form", "partner_terms"}
PERSONAL_PAGES = {"impressum.html", "datenschutz.html", "agb.html", "widerrufsbelehrung.html", "partner/terms.html"}
INDEXABLE = ["index.html", "compare.html", "play/index.html"]
SITE = "https://www.jarvquant.com"
REMOVED = [r"partner/(?:imprint|privacy|impressum|datenschutz)\.html", r"/partner/click"]
QUERY_TOKEN_ALLOWED = {"auth/verify/index.html": "customer e-mail confirmation of the app, not the partner area"}
TEXT = {".html", ".js", ".txt", ".xml", ".css", ".json"}

errors: list[str] = []
notes: list[str] = []


def fail(path: str, why: str) -> None:
    errors.append(f"{path}: {why}")


def files():
    for p in sorted(ROOT.rglob("*")):
        rel = p.relative_to(ROOT).as_posix()
        if not p.is_file() or rel.startswith(".git/") or rel.startswith("assets/fonts/") or rel.startswith("tools/"):
            continue
        if p.suffix in TEXT:
            yield rel, p.read_text(encoding="utf-8", errors="replace")


def line_of(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def check_telemetry(rel: str, text: str) -> None:
    if rel == "count.js":
        if not re.search(r'const\s+MODE\s*=\s*"off"\s*;', text):
            fail(rel, 'count.js is not switched off (const MODE = "off" expected)')
        return
    for pat, why in [(r"sendBeacon", "sendBeacon"), (r"/partner/click", "the old /partner/click beacon"),
                     (r"\bref\.js\b", "ref.js"), (r"google-analytics|googletagmanager|gtag\(|plausible|matomo|hotjar|"
                      r"segment\.com|fbq\(|mixpanel|posthog|clarity\.ms|cloudflareinsights", "an analytics script")]:
        for m in re.finditer(pat, text):
            fail(f"{rel}:{line_of(text, m.start())}", why)
    if rel.endswith(".html"):
        for m in re.finditer(r"<script[^>]+src=[\"'](https?:)?//([^\"']+)", text, re.I):
            url = m.group(0).split("src=")[1].strip("\"'")
            url = re.sub(r"[\"'].*", "", url)
            allowed = ALLOWED_SCRIPTS.get(rel)
            if allowed and url.startswith(allowed):
                notes.append(f"{rel}: third-party script allowed by name ({allowed})")
            else:
                fail(f"{rel}:{line_of(text, m.start())}", f"third-party script {url[:60]}")
    if re.search(r"import\s+.*from\s+[\"']https?:", text):
        fail(rel, "script imported from another host")


def check_claims(rel: str, text: str) -> None:
    if rel.endswith(".html"):
        for m in re.finditer(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', text, re.S | re.I):
            block = m.group(1)
            try:
                json.loads(block)
            except ValueError:
                fail(f"{rel}:{line_of(text, m.start())}", "JSON-LD that is not valid JSON")
            for pm in re.finditer(r"\d+(?:[.,]\d+)?\s?(?:%|percent|Prozent)", block):
                fail(f"{rel}:{line_of(text, m.start(1) + pm.start())}", f"rate or percentage in structured data: {pm.group(0)}")
    claims = [(r"\b12\s?(?:%|percent|Prozent)", "the old 12 % standard claim"),
              (r"standard commission|Standardprovision", "a standard commission claim"),
              (r"Earn (?:up to )?\d+", "an earnings promise"), (r"\b15\s?[–-]\s?25\s?%", "the old 15-25 % range"),
              (r"once \d+ of your referred", "the old customer threshold wording"),
              (r"(?<!no )(?<!no\s)guaranteed (?:income|earnings|commission)|passive income|Garantierte? (?:Einnahmen|Provision)", "a guarantee or income promise"),
              (r"\bPIN\b[^<\n]{0,40}\?(?:code|pin)=|\?code=[^\"'\s]*&pin=", "a code and PIN in an address")]
    for pat, why in claims:
        for m in re.finditer(pat, text, re.I):
            fail(f"{rel}:{line_of(text, m.start())}", why)


def check_secrets(rel: str, text: str) -> None:
    for m in re.finditer(r"""searchParams\.get\(\s*["'](pin|token|code|password|ref)["']""", text):
        if rel != "count.js":
            fail(f"{rel}:{line_of(text, m.start())}", f"{m.group(1)} read from a query string")
    for m in re.finditer(r"[?&](?:pin|token|password)=", text):
        if rel in QUERY_TOKEN_ALLOWED:
            notes.append(f"{rel}: token in a query string allowed by name ({QUERY_TOKEN_ALLOWED[rel]})")
            continue
        fail(f"{rel}:{line_of(text, m.start())}", "a PIN, token or password in a query string")
    if rel.startswith("partner/") or rel.startswith("legal/"):
        for m in re.finditer(r"localStorage|document\.cookie", text):
            fail(f"{rel}:{line_of(text, m.start())}", "localStorage or cookie in the partner/legal area")


def check_api(rel: str, text: str) -> None:
    for m in re.finditer(r"https?://[A-Za-z0-9.-]*onrender\.com[^\"'`\s]*", text):
        if not m.group(0).startswith(PROD_API):
            fail(f"{rel}:{line_of(text, m.start())}", f"an API base other than production: {m.group(0)}")
    for m in re.finditer(r"https?://(?:localhost|127\.0\.0\.1)(?::\d+)?", text):
        if rel not in LOCAL_API_FILES:
            fail(f"{rel}:{line_of(text, m.start())}", "a local API address outside the files that choose it by hostname")
    if rel in LOCAL_API_FILES:
        if not re.search(r'const LOCAL = \["localhost", "127\.0\.0\.1"\]\.includes\(location\.hostname\)', text):
            fail(rel, "the local API is not chosen by hostname alone")
        if re.search(r"(?:searchParams|URLSearchParams)[^;\n]*\bapi\b", text, re.I):
            fail(rel, "the API base can be switched by a parameter")


def exists(href: str, base: str) -> bool:
    path = re.split(r"[?#]", href, maxsplit=1)[0]
    if not path or path.startswith(("mailto:", "tel:", "javascript:", "data:", "http:", "https:", "//")):
        return True
    target = (ROOT / path.lstrip("/")) if path.startswith("/") else (ROOT / base / path)
    candidates = [target, target.with_suffix(".html"), target / "index.html"]
    return any(c.is_file() for c in candidates)


def check_links(rel: str, text: str) -> None:
    base = str(Path(rel).parent) if "/" in rel else ""
    if rel.endswith(".html"):
        for m in re.finditer(r"""(?:href|src)=["']([^"'#][^"']*|#?)["']""", text):
            href = m.group(1)
            if href and not exists(href, base):
                fail(f"{rel}:{line_of(text, m.start())}", f"link to a file that does not exist: {href}")
            if re.match(r"/r/|r/[A-Za-z0-9]", href):
                fail(f"{rel}:{line_of(text, m.start())}", f"/r/ referral link: {href}")
    for path in REMOVED:
        for m in re.finditer(path, text):
            if rel != "tools/site_check.py":
                fail(f"{rel}:{line_of(text, m.start())}", f"names a removed path: {path}")
    if rel in ("sitemap.xml", "robots.txt", "llms.txt"):
        for m in re.finditer(r"(?<!reddit\.com)/r/(?!JarvQuant)|/partner/", text):
            fail(f"{rel}:{line_of(text, m.start())}", "names a partner path or /r/ (the partner pages are noindex and unlisted)")
    for m in re.finditer(r"""["'(]/r/[A-Za-z0-9_-]*""", text):
        fail(f"{rel}:{line_of(text, m.start())}", "a /r/ referral link")


def check_legal() -> None:
    for page in LEGAL_PAGES:
        if not (ROOT / page).is_file():
            fail(page, "legal page missing")
    for page in LEGAL_PAGES:
        p = ROOT / page
        if page.endswith(".html") and p.is_file():
            t = p.read_text(encoding="utf-8")
            if "/legal/legal.js" not in t:
                fail(page, "does not load /legal/legal.js")
    for page in ("kuendigen.html", "widerrufen.html"):
        p = ROOT / page
        if p.is_file() and 'data-form' not in p.read_text(encoding="utf-8") and "data-doc" not in p.read_text(encoding="utf-8"):
            fail(page, "has neither a data-form nor a data-doc container")


def robots_values(text: str) -> set[str]:
    """What the robots meta tags in the <head> of the initial HTML say. Comments and scripts do not count."""
    head = re.sub(r"<!--.*?-->|<script\b.*?</script>", "", text.split("</head>")[0], flags=re.S | re.I)
    out: set[str] = set()
    for tag in re.findall(r"<meta\b[^>]*>", head, re.I):
        if re.search(r"""name=["'](?:robots|googlebot|bingbot)["']""", tag, re.I):
            m = re.search(r"""content=["']([^"']*)["']""", tag, re.I)
            out |= {v.strip().lower() for v in (m.group(1) if m else "").split(",")}
    return out


def robots_allows(robots: str, agent: str, path: str) -> bool:
    """RFC 9309, as Google and Bing read it: the most specific agent group, the longest matching rule, Allow on a tie.
    (urllib.robotparser takes the first match instead, so "Allow: /" at the top would hide every Disallow.)"""
    groups: dict[str, list[tuple[bool, str]]] = {}
    agents: list[str] = []
    in_rules = False
    for line in robots.splitlines():
        key, sep, value = line.split("#")[0].partition(":")
        key, value = key.strip().lower(), value.strip()
        if not sep:
            continue
        if key == "user-agent":
            if in_rules:
                agents, in_rules = [], False
            agents.append(value.lower())
            groups.setdefault(value.lower(), [])
        elif key in ("allow", "disallow"):
            in_rules = True
            for a in agents:
                if value:
                    groups[a].append((key == "allow", value))
    best = (-1, True)
    for allow, rule in groups.get(agent.lower(), groups.get("*", [])):
        pattern = re.escape(rule).replace(re.escape("*"), ".*")
        if pattern.endswith(re.escape("$")):
            pattern = pattern[:-len(re.escape("$"))] + "$"
        if re.match(pattern, path):
            best = max(best, (len(rule), allow))
    return best[1]


def check_indexing() -> None:
    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    personal = set(PERSONAL_PAGES)
    for rel, text in files():
        if not rel.endswith(".html"):
            continue
        shown = {d for m in re.findall(r"""data-doc=["']([^"']*)["']""", text) for d in m.split(",")}
        if shown & PERSONAL_DOCS:
            personal.add(rel)
        for m in re.finditer(r"""href=["']tel:|streetAddress|["']telephone["']|PostalAddress""", text):
            fail(f"{rel}:{line_of(text, m.start())}", "a phone number or address in the page itself")
    for rel in sorted(personal):
        p = ROOT / rel
        if not p.is_file():
            fail(rel, "page with the operator's details missing")
            continue
        if "noindex" not in robots_values(p.read_text(encoding="utf-8")):
            fail(rel, "shows the operator's details but is not noindex in its initial HTML")
        for path in (rel, rel.removesuffix(".html"), rel + "?lang=en", rel + "?version=x&lang=en"):
            for agent in ("*", "Googlebot", "Bingbot", "DuckDuckBot"):
                if not robots_allows(robots, agent, f"/{path}"):
                    fail("robots.txt", f"blocks /{path} for {agent}: the noindex there could not be read")
        if rel.removesuffix(".html") in sitemap:
            fail("sitemap.xml", f"lists {rel}")
    for rel in INDEXABLE:
        values = robots_values((ROOT / rel).read_text(encoding="utf-8"))
        if values & {"noindex", "none"}:
            fail(rel, "a product page must stay indexable")
        path = rel.removesuffix("index.html").removesuffix(".html")
        if not robots_allows(robots, "Googlebot", f"/{path}"):
            fail("robots.txt", f"blocks the product page /{path}")
        if f"<loc>{SITE}/{path}</loc>" not in sitemap:
            fail("sitemap.xml", f"does not list the product page /{path}")


def check_direct(release: bool) -> None:
    copy = legal_direct.copy_host()
    if copy and not legal_direct.valid(copy):
        fail("legal/legal.js", f"COPY is not a usable host: {copy}")
    if not copy:
        why = "no copy of the legal documents set: without the API only the links to the API and the mail address remain"
        fail("legal/legal.js", why) if release else notes.append(f"legal/legal.js: {why}")
    for page in legal_direct.PAGES:
        t = (ROOT / page).read_text(encoding="utf-8").replace("\r\n", "\n")
        if legal_direct.block(page, copy) not in t:
            fail(page, "direct links missing or not as tools/legal_direct.py writes them")
        static = re.sub(r"<script\b.*?</script>|<noscript>.*?</noscript>", "", t, flags=re.S)
        if "<h1>" not in static or "legal-direct" not in static:
            fail(page, "nothing to read without scripts")


def check_partner_pages() -> None:
    for page in ("index", "signup", "verify", "login", "forgot", "reset", "dashboard", "invitation", "stats", "terms"):
        p = ROOT / "partner" / f"{page}.html"
        if not p.is_file():
            fail(f"partner/{page}.html", "missing")
        elif "noindex" not in p.read_text(encoding="utf-8"):
            fail(f"partner/{page}.html", "not noindex")
    js = (ROOT / "partner/partner.js").read_text(encoding="utf-8")
    for bad in ("innerHTML", "outerHTML", "insertAdjacentHTML", "document.write", "eval("):
        if bad in js:
            fail("partner/partner.js", f"uses {bad}: every API value must go in as text")


def main() -> int:
    for rel, text in files():
        check_telemetry(rel, text)
        check_secrets(rel, text)
        check_api(rel, text)
        check_links(rel, text)
        if rel not in ("legal/legal.css", "site.css"):
            check_claims(rel, text)
    check_legal()
    check_indexing()
    check_direct("--release" in sys.argv[1:])
    check_partner_pages()
    for n in sorted(set(notes)):
        print("note:", n)
    for e in errors:
        print("FAIL:", e)
    print(f"site_check: {len(errors)} problem(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
