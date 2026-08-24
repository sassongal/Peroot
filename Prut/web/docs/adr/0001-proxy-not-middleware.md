# ADR-0001: Middleware lives in `src/proxy.ts`

**Status:** accepted · Next.js 16

Next.js 16 renamed `middleware.ts` to `proxy.ts`. Having **both** files present is
a fatal build error: `Both middleware file and proxy file are detected.`

All middleware logic (Supabase session refresh, CSRF, the admin UI gate,
maintenance mode) lives in `src/proxy.ts`, which exports `proxy` plus
`export const config = { matcher: [...] }`.

**Never create `src/middleware.ts`.** Any documentation that mentions it is stale.
