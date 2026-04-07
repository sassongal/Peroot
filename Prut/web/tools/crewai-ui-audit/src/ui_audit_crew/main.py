from __future__ import annotations

import argparse
import json
import pathlib
import sys
import os
import re

from ui_audit_crew.crew import build_crew
from ui_audit_crew.tools.browser import capture_screenshots
from ui_audit_crew.tools.sitemap import CrawlConfig, fetch_sitemap_urls, label_urls


def _write_text(path: pathlib.Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")

def _load_env_subset(env_file: pathlib.Path, *, keys: set[str]) -> None:
    """
    Load a small subset of KEY=VALUE lines without requiring strict .env parsing.
    This avoids failures on complex/invalid lines (e.g., pasted JSON blobs).
    """
    if not env_file.exists():
        return

    line_re = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$")
    for raw in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = line_re.match(line)
        if not m:
            continue
        k, v = m.group(1), m.group(2)
        if k not in keys:
            continue
        # Strip optional surrounding quotes
        if len(v) >= 2 and ((v[0] == v[-1] == '"') or (v[0] == v[-1] == "'")):
            v = v[1:-1]
        os.environ.setdefault(k, v)


def cli(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(prog="crewai-ui-audit")
    p.add_argument("--base-url", required=True, help="Production base URL, e.g. https://peroot.ai")
    p.add_argument("--max-urls", type=int, default=30, help="Max URLs to audit (default: 30)")
    p.add_argument("--include-regex", default=None, help="Regex filter for URLs to include")
    p.add_argument("--exclude-regex", default=None, help="Regex filter for URLs to exclude")
    p.add_argument("--rtl", action="store_true", help="Enable RTL/Hebrew focus")
    p.add_argument("--no-screenshots", action="store_true", help="Skip Playwright screenshots (faster, less accurate)")
    p.add_argument(
        "--artifacts-only",
        action="store_true",
        help="Only crawl sitemap + capture screenshots + write artifacts (no CrewAI/LLM required).",
    )
    p.add_argument(
        "--env-file",
        default=None,
        help="Path to env file to load (defaults to Prut/web/.env.local when running inside this repo).",
    )
    args = p.parse_args(argv)

    # main.py is at: tools/crewai-ui-audit/src/ui_audit_crew/main.py
    # parents[2] -> tools/crewai-ui-audit
    root = pathlib.Path(__file__).resolve().parents[2]
    web_root = root.parent.parent  # Prut/web
    config_dir = root / "src" / "ui_audit_crew" / "config"
    out_dir = root / "out"
    shots_dir = out_dir / "screenshots"
    out_dir.mkdir(parents=True, exist_ok=True)

    env_file = pathlib.Path(args.env_file) if args.env_file else (web_root / ".env.local")
    _load_env_subset(env_file, keys={"GROQ_API_KEY", "MISTRAL_API_KEY", "CREWAI_MODEL"})

    cfg = CrawlConfig(
        base_url=args.base_url,
        max_urls=args.max_urls,
        include_regex=args.include_regex,
        exclude_regex=args.exclude_regex,
    )

    urls = fetch_sitemap_urls(cfg)
    labeled = label_urls(urls, args.base_url)

    _write_text(out_dir / "sitemap_urls.md", "\n".join(f"- [{lab}] {u}" for lab, u in labeled) + "\n")

    pages_notes: list[dict] = []
    if not args.no_screenshots:
        pages_notes = capture_screenshots(
            [u for _, u in labeled],
            shots_dir,
            rtl=args.rtl,
            max_urls=args.max_urls,
        )
        _write_text(out_dir / "pages_notes.json", json.dumps(pages_notes, ensure_ascii=False, indent=2))

    inputs = {
        "base_url": args.base_url,
        "max_urls": args.max_urls,
        "rtl": args.rtl,
        "sitemap_urls_md": (out_dir / "sitemap_urls.md").read_text(encoding="utf-8"),
        "pages_notes_json": json.dumps(pages_notes, ensure_ascii=False),
        "screenshots_dir": str(shots_dir),
        "known_issue": "כפתור שיתוף בוואטסאפ דוחף כפתורים אחרים (לאתר, לתעד, ולהציע תיקון)",
    }

    # Make inputs visible to agents (CrewAI injects inputs into task descriptions via f-strings in many patterns;
    # here we keep it simple: add a short preface file for them to read in the artifacts directory).
    _write_text(
        out_dir / "inputs.md",
        "\n".join(
            [
                "# UI Audit Inputs",
                f"- Base URL: {args.base_url}",
                f"- Max URLs: {args.max_urls}",
                f"- RTL focus: {args.rtl}",
                f"- Screenshots: {'skipped' if args.no_screenshots else 'captured'}",
                "",
                "## Known issue to verify",
                inputs["known_issue"],
                "",
                "## Sitemap URLs (labeled)",
                inputs["sitemap_urls_md"],
            ]
        )
        + "\n",
    )

    if args.artifacts_only:
        return

    crew = build_crew(config_dir=config_dir, out_dir=out_dir, inputs=inputs)

    try:
        crew.kickoff(inputs=inputs)
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: crew execution failed: {e}", file=sys.stderr)
        raise


if __name__ == "__main__":
    cli()

