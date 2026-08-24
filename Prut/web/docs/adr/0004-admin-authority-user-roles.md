# ADR-0004: `user_roles` is the canonical admin source

**Status:** accepted

Admin authority comes from the **`user_roles`** table. `profiles.plan_tier` is only
an OR-fallback inside the `src/proxy.ts` UI gate; roughly 60 API routes use
`withAdmin` / `validateAdminSession`, which read `user_roles`.

**Consequence:** promoting someone means updating both, or the UI gate and the API
will disagree about who is an admin.

`ADMIN_EMAILS` is a **separate** maintenance-bypass list. It is not panel access.

**Measurement warning:** the 4 admin accounts are the owner's own and generate
roughly **35% of all `history` rows**. Exclude `user_roles` members before quoting
any usage, activation, or retention number, otherwise the product looks far
healthier than it is.
