# Engine changes — quality gates

When you change prompt templates or engine logic, define **success criteria** before merging:

1. **Capability mode** — Confirm the request routes to the intended engine (`CapabilityMode` / `parseCapabilityMode` in [`src/lib/capability-mode.ts`](../src/lib/capability-mode.ts)).
2. **Output shape** — Text modes: Hebrew policy and markdown structure as documented in engine templates. Video: English cinematic output, no meta-preamble. Image: platform-specific purity rules (see [`src/lib/engines/image-engine.ts`](../src/lib/engines/image-engine.ts)).
3. **Regression** — Run `npm run test` (includes [`src/lib/engines/__tests__/visual-engine-templates.test.ts`](../src/lib/engines/__tests__/visual-engine-templates.test.ts) and scoring tests). For scoring dimensions, see [`src/lib/engines/scoring/input-scorer.ts`](../src/lib/engines/scoring/input-scorer.ts).
4. **Admin / DB** — `prompt_engines.mode` is lowercase snake_case; runtime uses [`capabilityModeToDbMode`](../src/lib/capability-mode.ts). Visual engines: `general` templates and optional `default_params.platform_overrides` are documented in the engine editor UI.

## Where prompts live

| Area | Location |
|------|-----------|
| Standard / research / agent | `prompt_engines` + [`getEngine`](../src/lib/engines/index.ts) |
| Image `general` + JSON overrides | [`ImageEngine`](../src/lib/engines/image-engine.ts), `default_params.platform_overrides` |
| Video shell + overrides | [`VideoEngine`](../src/lib/engines/video-engine.ts), `PLATFORM_OVERRIDES` for injected `platform_override` |
| Per-request usage | `api_usage_logs.engine_mode` (see migrations), set from [`trackApiUsage`](../src/lib/admin/track-api-usage.ts) |
