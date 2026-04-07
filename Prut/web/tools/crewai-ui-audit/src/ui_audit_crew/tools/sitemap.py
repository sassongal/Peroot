from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

import httpx
from bs4 import BeautifulSoup


@dataclass(frozen=True)
class CrawlConfig:
    base_url: str
    max_urls: int
    include_regex: str | None = None
    exclude_regex: str | None = None


def _normalize_base_url(base_url: str) -> str:
    base_url = base_url.strip()
    return base_url[:-1] if base_url.endswith("/") else base_url


def fetch_sitemap_urls(cfg: CrawlConfig) -> list[str]:
    """
    Best-effort crawl of sitemap.xml (including sitemap index).
    Read-only: GET requests only.
    """
    base = _normalize_base_url(cfg.base_url)
    sitemap_url = f"{base}/sitemap.xml"

    include_re = re.compile(cfg.include_regex) if cfg.include_regex else None
    exclude_re = re.compile(cfg.exclude_regex) if cfg.exclude_regex else None

    def allowed(u: str) -> bool:
        if not u.startswith(base):
            return False
        if exclude_re and exclude_re.search(u):
            return False
        if include_re and not include_re.search(u):
            return False
        return True

    def parse_xml(xml_text: str) -> tuple[list[str], list[str]]:
        soup = BeautifulSoup(xml_text, "xml")
        urls = [loc.get_text(strip=True) for loc in soup.find_all("loc")]
        # Heuristic: sitemap index uses <sitemap><loc>; urlset uses <url><loc>.
        sitemaps = []
        if soup.find("sitemapindex"):
            sitemaps = urls
            urls = []
        return urls, sitemaps

    collected: list[str] = []
    to_visit: list[str] = [sitemap_url]
    seen: set[str] = set()

    with httpx.Client(timeout=20.0, follow_redirects=True, headers={"User-Agent": "Prut-UI-Audit/0.1"}) as client:
        while to_visit and len(collected) < cfg.max_urls:
            sm = to_visit.pop(0)
            if sm in seen:
                continue
            seen.add(sm)
            r = client.get(sm)
            r.raise_for_status()
            urls, sitemaps = parse_xml(r.text)
            for s in sitemaps:
                if s not in seen:
                    to_visit.append(s)
            for u in urls:
                if allowed(u):
                    collected.append(u)
                    if len(collected) >= cfg.max_urls:
                        break

    # De-dupe, preserve order.
    out: list[str] = []
    seen_u: set[str] = set()
    for u in collected:
        if u not in seen_u:
            out.append(u)
            seen_u.add(u)
    return out


def label_urls(urls: Iterable[str], base_url: str) -> list[tuple[str, str]]:
    """
    Lightweight labeling so the mapper agent gets useful hints.
    """
    base = _normalize_base_url(base_url)
    labeled: list[tuple[str, str]] = []
    for u in urls:
        path = u.replace(base, "", 1) or "/"
        if path == "/":
            label = "home"
        elif path.startswith("/pricing"):
            label = "pricing"
        elif path.startswith("/login"):
            label = "login"
        elif path.startswith("/guides"):
            label = "guides"
        elif path.startswith("/blog"):
            label = "blog"
        elif path.startswith("/prompts"):
            label = "prompts"
        elif path.startswith("/p/"):
            label = "shared-prompt"
        else:
            label = path.strip("/").split("/")[0][:40] or "page"
        labeled.append((label, u))
    return labeled

