-- ============================================================================
-- Migration: Backfill CREATE TABLE for tables that drifted out of source control
-- Version: 20260126000000_backfill_drifted_tables
-- ============================================================================
--
-- These 9 tables existed in PRODUCTION but had no CREATE TABLE anywhere in
-- supabase/migrations/ (5 had none at all; 4 lived only in stray root-level
-- create-*.sql files that were never promoted). A clean `db:migrate` / reset
-- would fail because later migrations (20260428_admin_change_tier*,
-- 20260717120000_security_perf_hardening, ...) ALTER/INSERT against them.
-- This is the same drift class as the historical `email_logs` incident — the
-- most serious case here being `credit_ledger`, the financial credit audit
-- ledger, whose schema was previously unreproducible from source control.
--
-- Every statement was reconstructed from the LIVE schema (columns via
-- format_type, constraints via pg_get_constraintdef, indexes via
-- pg_get_indexdef, RLS policies via pg_get_expr) and is idempotent, so this is
-- a safe no-op against the existing production DB and correct on a fresh reset.
-- Timestamped 20260126 so it runs after personal_library/user_roles (20260124)
-- and before the migrations that reference these tables (20260428 / 20260717).
-- Tables are ordered by FK dependency (referral_codes before referral_redemptions).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- credit_ledger: reconstructed from live schema (idempotent backfill).
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL,
  source text DEFAULT 'system'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credit_ledger_pkey PRIMARY KEY (id),
  CONSTRAINT credit_ledger_reason_check CHECK ((reason = ANY (ARRAY['registration_bonus'::text, 'daily_reset'::text, 'subscription_grant'::text, 'spend'::text, 'refund'::text, 'admin_grant'::text, 'admin_revoke'::text, 'churn_revoke'::text, 'referral_bonus'::text, 'admin_tier_change'::text]))),
  CONSTRAINT credit_ledger_source_check CHECK ((source = ANY (ARRAY['system'::text, 'admin'::text, 'webhook'::text]))),
  CONSTRAINT credit_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created_at ON public.credit_ledger USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON public.credit_ledger USING btree (user_id);
DROP POLICY IF EXISTS "Service can insert credit_ledger" ON public.credit_ledger;
CREATE POLICY "Service can insert credit_ledger" ON public.credit_ledger AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
DROP POLICY IF EXISTS "Users can read own credit_ledger" ON public.credit_ledger;
CREATE POLICY "Users can read own credit_ledger" ON public.credit_ledger AS PERMISSIVE FOR SELECT TO public USING ((( SELECT auth.uid() AS uid) = user_id));

-- ---------------------------------------------------------------------------
-- developer_api_keys: reconstructed from live schema (idempotent backfill).
CREATE TABLE IF NOT EXISTS public.developer_api_keys (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  name text DEFAULT 'Default'::text NOT NULL,
  scopes text[] DEFAULT ARRAY['enhance'::text],
  rate_limit integer DEFAULT 100,
  usage_count integer DEFAULT 0,
  last_used_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT developer_api_keys_pkey PRIMARY KEY (id),
  CONSTRAINT developer_api_keys_key_hash_key UNIQUE (key_hash),
  CONSTRAINT developer_api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.developer_api_keys ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_developer_api_keys_user_id ON public.developer_api_keys USING btree (user_id);
DROP POLICY IF EXISTS "Service role full access" ON public.developer_api_keys;
CREATE POLICY "Service role full access" ON public.developer_api_keys AS PERMISSIVE FOR ALL TO public USING ((( SELECT auth.role() AS role) = 'service_role'::text));
DROP POLICY IF EXISTS "Users can create own api keys" ON public.developer_api_keys;
CREATE POLICY "Users can create own api keys" ON public.developer_api_keys AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "Users can delete own api keys" ON public.developer_api_keys;
CREATE POLICY "Users can delete own api keys" ON public.developer_api_keys AS PERMISSIVE FOR DELETE TO public USING ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "Users can read own api keys" ON public.developer_api_keys;
CREATE POLICY "Users can read own api keys" ON public.developer_api_keys AS PERMISSIVE FOR SELECT TO public USING ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "Users can update own api keys" ON public.developer_api_keys;
CREATE POLICY "Users can update own api keys" ON public.developer_api_keys AS PERMISSIVE FOR UPDATE TO public USING ((user_id = ( SELECT auth.uid() AS uid)));

-- ---------------------------------------------------------------------------
-- email_sequences: reconstructed from live schema (idempotent backfill).
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  sequence_type text DEFAULT 'onboarding'::text NOT NULL,
  current_step integer DEFAULT 0,
  status text DEFAULT 'active'::text,
  started_at timestamp with time zone DEFAULT now(),
  last_sent_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT email_sequences_pkey PRIMARY KEY (id),
  CONSTRAINT email_sequences_user_id_sequence_type_key UNIQUE (user_id, sequence_type),
  CONSTRAINT email_sequences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_email_sequences_status ON public.email_sequences USING btree (status, current_step);
DROP POLICY IF EXISTS "Service role full access" ON public.email_sequences;
CREATE POLICY "Service role full access" ON public.email_sequences AS PERMISSIVE FOR ALL TO public USING ((( SELECT auth.role() AS role) = 'service_role'::text));
DROP POLICY IF EXISTS "Users can read own sequences" ON public.email_sequences;
CREATE POLICY "Users can read own sequences" ON public.email_sequences AS PERMISSIVE FOR SELECT TO public USING ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "Users can update own sequence status" ON public.email_sequences;
CREATE POLICY "Users can update own sequence status" ON public.email_sequences AS PERMISSIVE FOR UPDATE TO public USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

-- ---------------------------------------------------------------------------
-- prompt_chains: reconstructed from live schema (idempotent backfill).
CREATE TABLE IF NOT EXISTS public.prompt_chains (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  steps jsonb DEFAULT '[]'::jsonb NOT NULL,
  is_pinned boolean DEFAULT false,
  use_count integer DEFAULT 0,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prompt_chains_pkey PRIMARY KEY (id),
  CONSTRAINT prompt_chains_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.prompt_chains ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_chains_user ON public.prompt_chains USING btree (user_id);
DROP POLICY IF EXISTS "Users manage own chains" ON public.prompt_chains;
CREATE POLICY "Users manage own chains" ON public.prompt_chains AS PERMISSIVE FOR ALL TO public USING ((( SELECT auth.uid() AS uid) = user_id));

-- ---------------------------------------------------------------------------
-- prompt_versions: reconstructed from live schema (idempotent backfill).
CREATE TABLE IF NOT EXISTS public.prompt_versions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  prompt_id uuid NOT NULL,
  version_number integer NOT NULL,
  content text NOT NULL,
  title text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prompt_versions_pkey PRIMARY KEY (id),
  CONSTRAINT prompt_versions_prompt_id_version_number_key UNIQUE (prompt_id, version_number),
  CONSTRAINT prompt_versions_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES personal_library(id) ON DELETE CASCADE
);
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own prompt versions" ON public.prompt_versions;
CREATE POLICY "Users can read own prompt versions" ON public.prompt_versions AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM personal_library
  WHERE ((personal_library.id = prompt_versions.prompt_id) AND (personal_library.user_id = ( SELECT auth.uid() AS uid))))));

-- ---------------------------------------------------------------------------
-- newsletter_subscribers: reconstructed from live schema (idempotent backfill).
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  subscribed_at timestamp with time zone DEFAULT now(),
  unsubscribed_at timestamp with time zone,
  CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id),
  CONSTRAINT newsletter_subscribers_email_key UNIQUE (email)
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can read subscribers" ON public.newsletter_subscribers AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- prompt_folders: reconstructed from live schema (idempotent backfill).
CREATE TABLE IF NOT EXISTS public.prompt_folders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#f59e0b'::text,
  icon text DEFAULT 'folder'::text,
  sort_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prompt_folders_pkey PRIMARY KEY (id),
  CONSTRAINT prompt_folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.prompt_folders ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_prompt_folders_user ON public.prompt_folders USING btree (user_id);
DROP POLICY IF EXISTS "Users can create own folders" ON public.prompt_folders;
CREATE POLICY "Users can create own folders" ON public.prompt_folders AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "Users can delete own folders" ON public.prompt_folders;
CREATE POLICY "Users can delete own folders" ON public.prompt_folders AS PERMISSIVE FOR DELETE TO public USING ((( SELECT auth.uid() AS uid) = user_id));
DROP POLICY IF EXISTS "Users can read own folders" ON public.prompt_folders;
CREATE POLICY "Users can read own folders" ON public.prompt_folders AS PERMISSIVE FOR SELECT TO public USING ((( SELECT auth.uid() AS uid) = user_id));
DROP POLICY IF EXISTS "Users can update own folders" ON public.prompt_folders;
CREATE POLICY "Users can update own folders" ON public.prompt_folders AS PERMISSIVE FOR UPDATE TO public USING ((( SELECT auth.uid() AS uid) = user_id));

-- ---------------------------------------------------------------------------
-- referral_codes: reconstructed from live schema (idempotent backfill).
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  code text NOT NULL,
  uses_count integer DEFAULT 0,
  max_uses integer DEFAULT 50,
  credits_per_referral integer DEFAULT 5,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT referral_codes_pkey PRIMARY KEY (id),
  CONSTRAINT referral_codes_code_key UNIQUE (code),
  CONSTRAINT referral_codes_user_unique UNIQUE (user_id),
  CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can lookup codes" ON public.referral_codes;
CREATE POLICY "Authenticated can lookup codes" ON public.referral_codes AS PERMISSIVE FOR SELECT TO public USING ((( SELECT auth.uid() AS uid) IS NOT NULL));
DROP POLICY IF EXISTS "Users can create own referral code" ON public.referral_codes;
CREATE POLICY "Users can create own referral code" ON public.referral_codes AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

-- ---------------------------------------------------------------------------
-- referral_redemptions: reconstructed from live schema (idempotent backfill).
CREATE TABLE IF NOT EXISTS public.referral_redemptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  credits_awarded integer DEFAULT 5 NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT referral_redemptions_pkey PRIMARY KEY (id),
  CONSTRAINT referral_redemptions_user_unique UNIQUE (referred_user_id),
  CONSTRAINT referral_redemptions_code_id_fkey FOREIGN KEY (code_id) REFERENCES referral_codes(id) ON DELETE CASCADE,
  CONSTRAINT referral_redemptions_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_code_id ON public.referral_redemptions USING btree (code_id);
DROP POLICY IF EXISTS "Users can read own redemptions" ON public.referral_redemptions;
CREATE POLICY "Users can read own redemptions" ON public.referral_redemptions AS PERMISSIVE FOR SELECT TO public USING (((referred_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM referral_codes
  WHERE ((referral_codes.id = referral_redemptions.code_id) AND (referral_codes.user_id = ( SELECT auth.uid() AS uid)))))));
