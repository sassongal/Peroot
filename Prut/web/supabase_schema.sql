-- ============================================
-- Peroot Database Schema (Full Sync)
-- Refreshed on: 2026-02-01
-- ============================================

-- ============================================
-- 0. CORE TABLES (Profiles, Roles, Settings)
-- ============================================

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro')),
  credits_balance INTEGER NOT NULL DEFAULT 10,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (false);

-- USER ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'user')),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- USER STATS
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rank_title TEXT DEFAULT 'מחולל מתחיל',
  contribution_score INTEGER DEFAULT 0,
  total_copies INTEGER DEFAULT 0,
  total_saves_by_others INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  last_updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public user stats" ON public.user_stats FOR SELECT USING ((is_public = true) OR (auth.uid() = user_id));
CREATE POLICY "Users can manage their own privacy and stats" ON public.user_stats FOR ALL USING (auth.uid() = user_id);


-- USER STYLE PERSONALITY
CREATE TABLE IF NOT EXISTS public.user_style_personality (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  style_tokens TEXT[] DEFAULT '{}',
  preferred_format TEXT,
  personality_brief TEXT,
  version INTEGER DEFAULT 1,
  last_analyzed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_style_personality ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own style personality" ON public.user_style_personality FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own style personality" ON public.user_style_personality FOR UPDATE USING (auth.uid() = user_id);


-- SITE SETTINGS
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 1. PROMPT & LIBRARY SYSTEM
-- ============================================

-- PROMPT ENGINES
CREATE TABLE IF NOT EXISTS public.prompt_engines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt_template TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  output_format_instruction TEXT,
  default_params JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.prompt_engines ENABLE ROW LEVEL SECURITY;

-- AI PROMPTS (Backend Management)
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can read prompts" ON public.ai_prompts FOR SELECT USING (public.is_admin(auth.uid()));


-- AI PROMPT VERSIONS
CREATE TABLE IF NOT EXISTS public.ai_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES public.ai_prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  template_text TEXT NOT NULL,
  input_variables TEXT[],
  changelog TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can read prompt versions" ON public.ai_prompt_versions FOR SELECT USING (public.is_admin(auth.uid()));


-- LIBRARY CATEGORIES
CREATE TABLE IF NOT EXISTS public.library_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_he TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.library_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public library is readable by all" ON public.library_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.library_categories FOR ALL USING (public.is_admin(auth.uid()));


-- PUBLIC LIBRARY PROMPTS
CREATE TABLE IF NOT EXISTS public.public_library_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.library_categories(id),
  title_he TEXT NOT NULL,
  title_en TEXT,
  prompt_text TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  language TEXT DEFAULT 'he',
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.public_library_prompts ENABLE ROW LEVEL SECURITY;


-- PERSONAL LIBRARY
CREATE TABLE IF NOT EXISTS public.personal_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  prompt_style TEXT,
  category TEXT,
  personal_category TEXT NOT NULL DEFAULT 'כללי',
  use_case TEXT,
  source TEXT DEFAULT 'manual',
  use_count INTEGER NOT NULL DEFAULT 0,
  sort_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own library" ON public.personal_library FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into their own library" ON public.personal_library FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own library" ON public.personal_library FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete from their own library" ON public.personal_library FOR DELETE USING (auth.uid() = user_id);


-- PROMPT FAVORITES
CREATE TABLE IF NOT EXISTS public.prompt_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('library', 'personal')),
  item_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_type, item_id)
);

ALTER TABLE public.prompt_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites" ON public.prompt_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own favorites" ON public.prompt_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorites" ON public.prompt_favorites FOR DELETE USING (auth.uid() = user_id);


-- HISTORY
CREATE TABLE IF NOT EXISTS public.history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  enhanced_prompt TEXT NOT NULL,
  tone TEXT,
  category TEXT,
  capability_mode TEXT DEFAULT 'STANDARD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own history" ON public.history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own history" ON public.history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own history" ON public.history FOR DELETE USING (auth.uid() = user_id);


-- ============================================
-- 2. ANALYTICS & LOGGING
-- ============================================

-- PROMPT POPULARITY
CREATE TABLE IF NOT EXISTS public.prompt_popularity (
  prompt_id TEXT PRIMARY KEY,
  count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_popularity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view prompt popularity" ON public.prompt_popularity FOR SELECT USING (true);


-- PROMPT USAGE EVENTS
CREATE TABLE IF NOT EXISTS public.prompt_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('copy', 'save', 'refine')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prompt_length INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log usage events" ON public.prompt_usage_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can read all events" ON public.prompt_usage_events FOR SELECT USING (auth.role() = 'service_role');


-- ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- or SET NULL based on user preference
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read all logs" ON public.activity_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can read own logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);


-- BACKGROUND JOBS
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('style_analysis', 'achievement_check')),
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.background_jobs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Auth users can insert jobs" ON public.background_jobs FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- ============================================
-- 3. GAMIFICATION & SOCIAL
-- ============================================

-- ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY,
  name_he TEXT NOT NULL,
  description_he TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);


-- USER ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own unlocked achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);


-- USER FOLLOWS
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view follows" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON public.user_follows FOR ALL USING (auth.uid() = follower_id);


-- TRANSLATIONS (I18N)
CREATE TABLE IF NOT EXISTS public.translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  lang TEXT DEFAULT 'he',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (key, lang)
);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access for all users" ON public.translations FOR SELECT USING (true);

-- ============================================
-- 4. VIEWS
-- ============================================

CREATE OR REPLACE VIEW public.global_leaderboard AS
SELECT 
    p.id AS user_id,
    p.full_name AS full_name,  -- Note: verify if full_name exists in profiles or comes from metadata
    p.avatar_url AS avatar_url,
    s.rank_title,
    s.contribution_score,
    s.total_copies,
    s.total_saves_by_others
FROM 
    profiles p
JOIN 
    user_stats s ON p.id = s.user_id
WHERE 
    s.is_public = true
ORDER BY 
    s.contribution_score DESC;

-- ============================================
-- 5. UTILITY FUNCTIONS
-- ============================================

-- Increment Popularity Function
CREATE OR REPLACE FUNCTION public.increment_prompt_popularity(p_prompt_id TEXT, delta INTEGER DEFAULT 1)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  INSERT INTO public.prompt_popularity (prompt_id, count, updated_at)
  VALUES (p_prompt_id, GREATEST(delta, 1), now())
  ON CONFLICT (prompt_id)
  DO UPDATE SET
    count = prompt_popularity.count + GREATEST(delta, 1),
    updated_at = now()
  RETURNING count INTO new_count;

  RETURN new_count;
END;
$$;

-- Is Admin Function (Assumed helper)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
