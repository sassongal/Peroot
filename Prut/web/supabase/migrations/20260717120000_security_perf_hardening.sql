-- ============================================================================
-- Security + performance hardening (2026-07-17)
-- Generated from a full DB audit. All changes are behavior-preserving for the
-- app, which calls the affected functions only via the service-role client.
--
-- SECTION 1 (CRITICAL security): revoke EXECUTE on privileged SECURITY DEFINER
--   functions from anon/authenticated. Without this, any logged-in user could
--   call e.g. grant_admin_role(self) via /rest/v1/rpc and self-escalate.
--   The app invokes all of these via createServiceClient() (service_role keeps
--   EXECUTE), so this does not affect application behavior.
-- SECTION 2: pin search_path on flagged functions (injection hardening).
-- SECTION 3: drop redundant duplicate indexes (keep UNIQUE-constraint ones).
-- SECTION 4: add missing foreign-key indexes.
-- SECTION 5: RLS initplan optimization — wrap auth.uid()/auth.role() in a
--   scalar subselect so it is evaluated once per query instead of per row.
--   Semantically identical (Supabase-recommended); no access-logic change.
-- ============================================================================

-- SECTION 1 — CRITICAL: revoke over-exposed privileged functions ---------------
REVOKE EXECUTE ON FUNCTION public.grant_admin_role(uuid)                         FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_admin_role(uuid)                        FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_change_tier(uuid, text)                  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_credits(uuid, integer)           FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_admin_app_metadata()                      FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_credit_change(uuid, integer, integer, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_credit(uuid, integer)                   FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_decrement_credits(uuid, integer)     FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_credits(uuid, integer)              FROM anon, authenticated;

-- SECTION 2 — pin search_path -------------------------------------------------
ALTER FUNCTION public.sync_admin_app_metadata()                SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user_stats()                  SET search_path TO 'public';
ALTER FUNCTION public.update_variable_presets_updated_at()     SET search_path TO 'public';
ALTER FUNCTION public.update_user_memory_facts_updated_at()    SET search_path TO 'public';

-- SECTION 3 — drop redundant duplicate indexes --------------------------------
DROP INDEX IF EXISTS public.idx_personal_lib_user_cat;
DROP INDEX IF EXISTS public.idx_subscriptions_user_id;
DROP INDEX IF EXISTS public.idx_blog_posts_slug;
DROP INDEX IF EXISTS public.idx_presets_user;
DROP INDEX IF EXISTS public.model_profiles_slug_idx;

-- SECTION 4 — add missing foreign-key indexes ---------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_prompts_created_by          ON public.ai_prompts(created_by);
CREATE INDEX IF NOT EXISTS idx_developer_api_keys_user_id     ON public.developer_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_costs_created_by        ON public.manual_costs(created_by);
CREATE INDEX IF NOT EXISTS idx_prompt_usage_events_user_id    ON public.prompt_usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_code_id   ON public.referral_redemptions(code_id);
CREATE INDEX IF NOT EXISTS idx_shared_prompts_user_id         ON public.shared_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_granted_by          ON public.user_roles(granted_by);

-- SECTION 5 — RLS initplan optimization (59 policies) -------------------------
ALTER POLICY "Admins can read all logs" ON public.activity_logs
  USING (is_admin((select auth.uid())));

ALTER POLICY "Service role and authenticated users can insert logs" ON public.activity_logs
  WITH CHECK ((((select auth.uid()) = user_id) OR ((select auth.role()) = 'service_role'::text)));

ALTER POLICY "Only admins can read prompt versions" ON public.ai_prompt_versions
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = 'admin'::text)))));

ALTER POLICY "Only admins can read prompts" ON public.ai_prompts
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = 'admin'::text)))));

ALTER POLICY "Admins can read api_usage_logs" ON public.api_usage_logs
  USING (is_admin((select auth.uid())));

ALTER POLICY "Auth users can insert jobs" ON public.background_jobs
  WITH CHECK (((select auth.role()) = 'authenticated'::text));

ALTER POLICY "Service role full access" ON public.background_jobs
  USING (((select auth.role()) = 'service_role'::text))
  WITH CHECK (((select auth.role()) = 'service_role'::text));

ALTER POLICY "Admins can do everything" ON public.blog_posts
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = 'admin'::text)))));

ALTER POLICY "admin_content_factory_presets" ON public.content_factory_presets
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = 'admin'::text)))));

ALTER POLICY "admin_content_gen_log" ON public.content_generation_log
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = 'admin'::text)))));

ALTER POLICY "Service role full access" ON public.developer_api_keys
  USING (((select auth.role()) = 'service_role'::text));

ALTER POLICY "Users can create own api keys" ON public.developer_api_keys
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can delete own api keys" ON public.developer_api_keys
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can read own api keys" ON public.developer_api_keys
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can update own api keys" ON public.developer_api_keys
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Service role full access" ON public.email_sequences
  USING (((select auth.role()) = 'service_role'::text));

ALTER POLICY "Users can read own sequences" ON public.email_sequences
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can update own sequence status" ON public.email_sequences
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "extension_configs_read_authenticated" ON public.extension_configs
  USING (((select auth.role()) = 'authenticated'::text));

ALTER POLICY "Users can insert their own history" ON public.history
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Admins can manage categories" ON public.library_categories
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = 'admin'::text)))));

ALTER POLICY "Admins can manage manual_costs" ON public.manual_costs
  USING (is_admin((select auth.uid())));

ALTER POLICY "model_profiles_read_authenticated" ON public.model_profiles
  USING (((select auth.role()) = 'authenticated'::text));

ALTER POLICY "Admins can read subscribers" ON public.newsletter_subscribers
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = 'admin'::text)))));

ALTER POLICY "Users can insert their own personal prompts" ON public.personal_library
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "source_history_id ownership" ON public.personal_library
  USING (((source_history_id IS NULL) OR (EXISTS ( SELECT 1
   FROM history h
  WHERE ((h.id = personal_library.source_history_id) AND (h.user_id = (select auth.uid())))))))
  WITH CHECK (((source_history_id IS NULL) OR (EXISTS ( SELECT 1
   FROM history h
  WHERE ((h.id = personal_library.source_history_id) AND (h.user_id = (select auth.uid())))))));

ALTER POLICY "Admins can read all profiles" ON public.profiles
  USING (is_admin((select auth.uid())));

ALTER POLICY "Users can insert their own profile." ON public.profiles
  WITH CHECK (((select auth.uid()) = id));

ALTER POLICY "Users can read own profile" ON public.profiles
  USING (((select auth.uid()) = id));

ALTER POLICY "Users can update own profile." ON public.profiles
  USING (((select auth.uid()) = id));

ALTER POLICY "Users can update their own profile" ON public.profiles
  USING (((select auth.uid()) = id));

ALTER POLICY "Users can view their own profile" ON public.profiles
  USING (((select auth.uid()) = id));

ALTER POLICY "Admins can do everything on prompt_engines" ON public.prompt_engines
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = 'admin'::text)))));

ALTER POLICY "Users can insert own favorites" ON public.prompt_favorites
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert their own favorites" ON public.prompt_favorites
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "service role reads all" ON public.prompt_feedback
  USING (((select auth.role()) = 'service_role'::text));

ALTER POLICY "users insert own feedback" ON public.prompt_feedback
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can create own folders" ON public.prompt_folders
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can read own prompt versions" ON public.prompt_versions
  USING ((EXISTS ( SELECT 1
   FROM personal_library
  WHERE ((personal_library.id = prompt_versions.prompt_id) AND (personal_library.user_id = (select auth.uid()))))));

ALTER POLICY "Admins can manage public prompts" ON public.public_library_prompts
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = 'admin'::text)))));

ALTER POLICY "Authenticated users can lookup codes" ON public.referral_codes
  USING (((select auth.uid()) IS NOT NULL));

ALTER POLICY "Users can create own referral code" ON public.referral_codes
  WITH CHECK ((user_id = (select auth.uid())));

ALTER POLICY "Users can read own referral code" ON public.referral_codes
  USING ((user_id = (select auth.uid())));

ALTER POLICY "Users can read own redemptions" ON public.referral_redemptions
  USING (((referred_user_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM referral_codes
  WHERE ((referral_codes.id = referral_redemptions.code_id) AND (referral_codes.user_id = (select auth.uid())))))));

ALTER POLICY "Users can share prompts" ON public.shared_prompts
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Authenticated users can update settings" ON public.site_settings
  USING (((select auth.role()) = 'authenticated'::text));

ALTER POLICY "Admins read skill_selections" ON public.skill_selections
  USING (is_admin((select auth.uid())));

ALTER POLICY "Users can read own subscription" ON public.subscriptions
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Only admins can manage translations" ON public.translations
  USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = (select auth.uid())) AND (user_roles.role = 'admin'::text)))));

ALTER POLICY "Users can view their own unlocked achievements" ON public.user_achievements
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can manage their own follows" ON public.user_follows
  USING (((select auth.uid()) = follower_id));

ALTER POLICY "Users can read own roles" ON public.user_roles
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can view own roles" ON public.user_roles
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Anyone can view public user stats" ON public.user_stats
  USING (((is_public = true) OR ((select auth.uid()) = user_id)));

ALTER POLICY "Users can manage their own privacy and stats" ON public.user_stats
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can update their own style personality" ON public.user_style_personality
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can view their own style personality" ON public.user_style_personality
  USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert their own variables" ON public.user_variables
  WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can insert their own presets" ON public.variable_presets
  WITH CHECK (((select auth.uid()) = user_id));

