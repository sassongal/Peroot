-- Peroot Connect Phase 3 — OAuth 2.1 (PKCE, dynamic client registration).
-- Lets claude.ai web / ChatGPT connectors authenticate without a prk_ key.
--
-- oauth_clients: public clients (RFC 7591, no secret — PKCE is the proof).
-- oauth_tokens:  opaque bearer tokens, stored ONLY as SHA-256 hashes.
--                access  → pot_… (30 days)
--                refresh → por_… (90 days, rotated on every use)
-- Auth codes live in Redis (10 min TTL, one-time) — never in Postgres.

CREATE TABLE IF NOT EXISTS public.oauth_clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     text NOT NULL UNIQUE,
  client_name   text NOT NULL,
  redirect_uris text[] NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz
);

CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash    text NOT NULL UNIQUE,
  token_prefix  text NOT NULL,
  token_type    text NOT NULL CHECK (token_type IN ('access', 'refresh')),
  user_id       uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  client_id     text NOT NULL,
  scope         text NOT NULL DEFAULT 'connect',
  expires_at    timestamptz NOT NULL,
  revoked       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz
);

CREATE INDEX IF NOT EXISTS oauth_tokens_prefix_idx
  ON public.oauth_tokens (token_prefix) WHERE NOT revoked;
CREATE INDEX IF NOT EXISTS oauth_tokens_user_idx
  ON public.oauth_tokens (user_id);

ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Clients are written/read only by the service role (registration endpoint).
-- No user-facing policies on oauth_clients by design.

-- Users may see and revoke their own connected-app tokens (future settings UI).
DO $$ BEGIN
  CREATE POLICY oauth_tokens_select_own ON public.oauth_tokens
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY oauth_tokens_delete_own ON public.oauth_tokens
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
