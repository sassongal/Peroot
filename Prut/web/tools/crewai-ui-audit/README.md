## CrewAI UI + RTL Audit (Prod)

This tool runs a small CrewAI “team” that:

- Crawls your production site via `sitemap.xml`
- Captures screenshots in **mobile + desktop**
- Produces:
  - `out/issue_list.md` — prioritized UI/UX cosmetic issues
  - `out/big_improvements.md` — high-impact “big improvements” (GitHub/CI/DevEx)
  - `out/prompt_for_fix_agent.md` — a ready-to-paste prompt for an implementation agent

### Prerequisites

- Python 3.11+
- Playwright browsers installed for Python

### Setup

```bash
cd tools/crewai-ui-audit
python -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -e .
python -m playwright install chromium
```

### Run

```bash
crewai-ui-audit \
  --base-url "https://YOUR-PROD-DOMAIN" \
  --max-urls 40 \
  --include-regex "/(pricing|login|guides|prompts|p/|blog)/" \
  --rtl
```

Outputs will be written to `tools/crewai-ui-audit/out/`.

### Notes / Safety

- This is **read-only** against production (GET requests + screenshots).
- It does **not** log in; it focuses on the **public site**.
- If you want auth-area scanning, extend `ui_audit_crew/tools/browser.py` with a login step (kept out intentionally).

