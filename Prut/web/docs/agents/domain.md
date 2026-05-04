# Domain Docs

## Layout: single-context

This repo has a single domain context:

- **`CONTEXT.md`** — domain language, key concepts, business rules (to be created when needed)
- **`docs/adr/`** — architectural decision records (to be created when needed)

## Consumer rules

When a skill reads domain context:
1. Check `CONTEXT.md` at the repo root for domain language and business rules
2. Check `docs/adr/` for past architectural decisions
3. Cross-reference `docs/STATUS.md` for current feature state (live / experimental / disabled)
4. Cross-reference `CLAUDE.md` for stack, conventions, and critical gotchas

## Current state

- `CONTEXT.md`: **not yet created** — skills that need it will work without it but benefit from it
- `docs/adr/`: **not yet created** — create when a significant architectural decision is made

## Project domain summary (inline until CONTEXT.md exists)

Peroot (פירוט) is a Hebrew-first AI prompt engineering platform.

Key concepts:
- **Engines**: Standard, Research, Image, Agent, Video — all extend BaseEngine with 10-dimension scoring
- **Credits**: Free (2/day reset 14:00 IL), Pro (150/month via LemonSqueezy)
- **AI Gateway**: Gemini 2.5 Flash → Mistral Small → Flash Lite → Llama 4 Scout (circuit breaker + concurrency)
- **Library**: Personal prompt library with graph view (force-directed)
- **Extension**: Chrome extension v2.1 (M1-M3) with config-driven selectors
