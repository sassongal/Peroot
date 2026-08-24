# Deploy Check

Verify a change is actually live on peroot.space. Deploying is not "done".

Run from `Prut/web`:

1. **Gates** — `npm run typecheck && npm run test && npm run build`. All three
   must pass locally before you push; CI runs the same three but is advisory
   (no branch protection, see `docs/adr/0005-ci-is-advisory.md`).
2. **CI** — after pushing, check the run at
   https://github.com/sassongal/Peroot/actions. Both `Typecheck · Lint · Test`
   and `Production build` must be green.
3. **Deploy** — confirm the Vercel deployment for *your commit SHA* reached
   `READY` on the `production` target. A READY deploy of an older SHA is not
   your change.
4. **Live assertion** — fetch the real page and assert the change is present in
   the served HTML. Do not trust the dashboard. Example:
   `curl -s https://www.peroot.space/templates | grep -c "570+"`
5. **Errors** — check Sentry for new issues introduced by the deploy:
   https://joya-tech.sentry.io/issues/

Notes:
- The AI gateway lives in `src/lib/ai/gateway.ts` (fallback chain, circuit
  breaker, concurrency limiter). There is no `llm-router.ts`.
- Providers in use: Gemini, Groq, Mistral, DeepSeek. There is no
  `ANTHROPIC_API_KEY` in this project.
- Rate limiting is Upstash Redis sliding-window; auth/CSRF/admin gating is in
  `src/proxy.ts`, never `middleware.ts`.
- Hebrew is the default. Check RTL rendering on any UI you touched.
