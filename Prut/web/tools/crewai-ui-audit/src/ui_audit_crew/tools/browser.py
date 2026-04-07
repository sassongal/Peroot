from __future__ import annotations

import pathlib
from dataclasses import dataclass

from playwright.sync_api import sync_playwright


@dataclass(frozen=True)
class Viewport:
    name: str
    width: int
    height: int


MOBILE = Viewport(name="mobile-390x844", width=390, height=844)
DESKTOP = Viewport(name="desktop-1440x900", width=1440, height=900)


def capture_screenshots(
    urls: list[str],
    out_dir: pathlib.Path,
    *,
    rtl: bool,
    max_urls: int,
    timeout_ms: int = 25_000,
) -> list[dict]:
    """
    Captures screenshots for each URL in mobile + desktop viewports.
    Returns page notes that the LLM agents can use (title, final URL, errors).
    """
    out_dir.mkdir(parents=True, exist_ok=True)

    def shot_path(i: int, vp: Viewport) -> pathlib.Path:
        return out_dir / f"{i:03d}-{vp.name}.png"

    pages: list[dict] = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(locale="he-IL" if rtl else "en-US")
        page = context.new_page()
        page.set_default_timeout(timeout_ms)

        for i, url in enumerate(urls[:max_urls]):
            entry: dict = {"index": i, "url": url, "final_url": None, "title": None, "errors": []}
            try:
                # Desktop first
                page.set_viewport_size({"width": DESKTOP.width, "height": DESKTOP.height})
                page.goto(url, wait_until="networkidle")
                entry["final_url"] = page.url
                entry["title"] = page.title()
                page.screenshot(path=str(shot_path(i, DESKTOP)), full_page=True)

                # Mobile
                page.set_viewport_size({"width": MOBILE.width, "height": MOBILE.height})
                page.goto(url, wait_until="networkidle")
                page.screenshot(path=str(shot_path(i, MOBILE)), full_page=True)
            except Exception as e:  # noqa: BLE001 - best-effort crawler
                entry["errors"].append(str(e))
            pages.append(entry)

        context.close()
        browser.close()

    return pages

