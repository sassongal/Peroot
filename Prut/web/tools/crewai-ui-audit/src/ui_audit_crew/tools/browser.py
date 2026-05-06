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

# Injected into the page to extract structural + accessibility data without axe dependency.
_EXTRACT_JS = """
() => {
    const out = {};

    // Page-level metadata
    out.lang = document.documentElement.lang || "";
    out.dir = document.documentElement.dir || "";
    out.console_errors = [];  // populated separately via page.on("console")

    // Headings hierarchy
    out.headings = Array.from(document.querySelectorAll("h1,h2,h3")).slice(0,20).map(h => ({
        tag: h.tagName, text: h.innerText.trim().slice(0,120)
    }));

    // Nav links (first 15)
    out.nav_links = Array.from(document.querySelectorAll("nav a, header a")).slice(0,15).map(a => ({
        text: a.innerText.trim().slice(0,60), href: a.getAttribute("href") || ""
    }));

    // Buttons and CTAs
    out.buttons = Array.from(document.querySelectorAll("button, [role=button], a.btn, a[class*='btn'], a[class*='button']"))
        .slice(0,25).map(b => ({
            tag: b.tagName, text: b.innerText.trim().slice(0,80),
            aria: b.getAttribute("aria-label") || ""
        }));

    // Form inputs
    out.inputs = Array.from(document.querySelectorAll("input, textarea, select")).slice(0,15).map(inp => ({
        type: inp.type || inp.tagName, placeholder: inp.placeholder || "",
        label: (document.querySelector(`label[for="${inp.id}"]`) || {}).innerText || "",
        dir: inp.dir || "", "aria-label": inp.getAttribute("aria-label") || ""
    }));

    // Images missing alt
    out.images_missing_alt = Array.from(document.querySelectorAll("img:not([alt]), img[alt='']"))
        .slice(0,10).map(img => img.src.split("/").pop());

    // Sticky / fixed elements
    out.sticky_elements = Array.from(document.querySelectorAll("*")).filter(el => {
        const pos = getComputedStyle(el).position;
        return pos === "sticky" || pos === "fixed";
    }).slice(0,10).map(el => ({
        tag: el.tagName, class: el.className.toString().slice(0,60),
        text: el.innerText.trim().slice(0,60)
    }));

    // z-index issues (elements with very high z-index)
    out.high_zindex = Array.from(document.querySelectorAll("*")).filter(el => {
        const z = parseInt(getComputedStyle(el).zIndex, 10);
        return z > 100;
    }).slice(0,8).map(el => ({
        tag: el.tagName, class: el.className.toString().slice(0,60), zIndex: getComputedStyle(el).zIndex
    }));

    // RTL/LTR direction on key containers
    out.direction_map = Array.from(document.querySelectorAll("[dir]")).slice(0,15).map(el => ({
        tag: el.tagName, dir: el.dir, class: el.className.toString().slice(0,50)
    }));

    // Main text sample (first 400 chars of visible body text)
    out.body_text_sample = (document.body.innerText || "").replace(/\\s+/g," ").trim().slice(0,400);

    // Check for logical CSS properties (basic heuristic via inline styles)
    out.physical_props_found = Array.from(document.querySelectorAll("[style]"))
        .filter(el => /margin-left|margin-right|padding-left|padding-right|float:\\s*(left|right)/i.test(el.style.cssText))
        .slice(0,5).map(el => ({ tag: el.tagName, style: el.style.cssText.slice(0,100) }));

    return out;
}
"""


def capture_screenshots(
    urls: list[str],
    out_dir: pathlib.Path,
    *,
    rtl: bool,
    max_urls: int,
    timeout_ms: int = 25_000,
) -> list[dict]:
    """
    Captures screenshots + rich page data for each URL (desktop + mobile viewports).
    Returns page notes the LLM agents can use: title, final URL, headings, buttons,
    inputs, sticky elements, direction attributes, images missing alt, and more.
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
            entry: dict = {
                "index": i,
                "url": url,
                "final_url": None,
                "title": None,
                "errors": [],
                "desktop": {},
                "mobile": {},
            }
            try:
                # --- Desktop ---
                console_errors: list[str] = []
                page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
                page.set_viewport_size({"width": DESKTOP.width, "height": DESKTOP.height})
                page.goto(url, wait_until="networkidle")
                entry["final_url"] = page.url
                entry["title"] = page.title()
                page.screenshot(path=str(shot_path(i, DESKTOP)), full_page=True)

                desktop_data = page.evaluate(_EXTRACT_JS)
                desktop_data["console_errors"] = console_errors[:10]
                entry["desktop"] = desktop_data

                # --- Mobile ---
                console_errors_mobile: list[str] = []
                page.on("console", lambda m: console_errors_mobile.append(m.text) if m.type == "error" else None)
                page.set_viewport_size({"width": MOBILE.width, "height": MOBILE.height})
                page.goto(url, wait_until="networkidle")
                page.screenshot(path=str(shot_path(i, MOBILE)), full_page=True)

                mobile_data = page.evaluate(_EXTRACT_JS)
                mobile_data["console_errors"] = console_errors_mobile[:10]
                entry["mobile"] = mobile_data

            except Exception as e:  # noqa: BLE001 - best-effort crawler
                entry["errors"].append(str(e))
            pages.append(entry)

        context.close()
        browser.close()

    return pages

