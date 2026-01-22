-- ============================================
-- Peroot Database Schema for Supabase
-- Run this SQL in the Supabase SQL Editor
-- ============================================

-- ============================================
-- 0. PROFILES TABLE (User Extension)
-- AUTOMATICALLY MANAGED BY TRIGGER
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro')),
  credits_balance INTEGER NOT NULL DEFAULT 10,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (false);

-- Trigger for new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, plan_tier, credits_balance)
  VALUES (new.id, 'free', 10);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 1. HISTORY TABLE
-- Stores user prompt enhancement history
-- ============================================
CREATE TABLE IF NOT EXISTS public.history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  enhanced_prompt TEXT NOT NULL,
  tone TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS history_user_id_idx ON public.history(user_id);
CREATE INDEX IF NOT EXISTS history_created_at_idx ON public.history(user_id, created_at DESC);

-- RLS Policies for history
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own history" ON public.history;
CREATE POLICY "Users can view their own history"
  ON public.history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own history" ON public.history;
CREATE POLICY "Users can insert their own history"
  ON public.history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own history" ON public.history;
CREATE POLICY "Users can delete their own history"
  ON public.history FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================
-- 2. PERSONAL_LIBRARY TABLE
-- Stores user's saved prompts
-- ============================================
CREATE TABLE IF NOT EXISTS public.personal_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_he TEXT NOT NULL,
  prompt_he TEXT NOT NULL,
  prompt_style TEXT,
  category TEXT,
  personal_category TEXT NOT NULL DEFAULT 'כללי',
  use_case TEXT,
  source TEXT,
  use_count INTEGER NOT NULL DEFAULT 0,
  sort_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS personal_library_user_id_idx ON public.personal_library(user_id);
CREATE INDEX IF NOT EXISTS personal_library_user_category_idx ON public.personal_library(user_id, personal_category);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_personal_library_updated_at ON public.personal_library;
CREATE TRIGGER update_personal_library_updated_at
  BEFORE UPDATE ON public.personal_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for personal_library
ALTER TABLE public.personal_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own library" ON public.personal_library;
CREATE POLICY "Users can view their own library"
  ON public.personal_library FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert into their own library" ON public.personal_library;
CREATE POLICY "Users can insert into their own library"
  ON public.personal_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own library" ON public.personal_library;
CREATE POLICY "Users can update their own library"
  ON public.personal_library FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete from their own library" ON public.personal_library;
CREATE POLICY "Users can delete from their own library"
  ON public.personal_library FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================
-- 3. PROMPT_FAVORITES TABLE
-- Stores user's favorite prompts
-- ============================================
CREATE TABLE IF NOT EXISTS public.prompt_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('library', 'personal')),
  item_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_type, item_id)
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS prompt_favorites_user_idx ON public.prompt_favorites(user_id, item_type);

-- RLS Policies for prompt_favorites
ALTER TABLE public.prompt_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own favorites" ON public.prompt_favorites;
CREATE POLICY "Users can view their own favorites"
  ON public.prompt_favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.prompt_favorites;
CREATE POLICY "Users can insert their own favorites"
  ON public.prompt_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.prompt_favorites;
CREATE POLICY "Users can delete their own favorites"
  ON public.prompt_favorites FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================
-- 4. PROMPT_POPULARITY TABLE
-- Tracks popularity of library prompts (public)
-- ============================================
CREATE TABLE IF NOT EXISTS public.prompt_popularity (
  prompt_id TEXT PRIMARY KEY,
  count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Function to increment popularity
CREATE OR REPLACE FUNCTION increment_prompt_popularity(p_prompt_id TEXT, delta INTEGER DEFAULT 1)
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

-- RLS for prompt_popularity (public read, server-side/RPC write only)
ALTER TABLE public.prompt_popularity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view prompt popularity" ON public.prompt_popularity;
CREATE POLICY "Anyone can view prompt popularity"
  ON public.prompt_popularity FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can update popularity" ON public.prompt_popularity;
-- Removed direct update policy to force usage of RPC or Service Role

DROP POLICY IF EXISTS "Authenticated users can increment popularity" ON public.prompt_popularity;
-- Removed direct update policy for security


-- ============================================
-- 5. PROMPT_USAGE_EVENTS TABLE (Optional)
-- Detailed analytics on prompt usage
-- ============================================
CREATE TABLE IF NOT EXISTS public.prompt_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('copy', 'save', 'refine')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prompt_length INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS prompt_usage_events_prompt_id_idx ON public.prompt_usage_events(prompt_id);
CREATE INDEX IF NOT EXISTS prompt_usage_events_created_at_idx ON public.prompt_usage_events(created_at DESC);

-- RLS (allow insert from anyone, select for analytics)
ALTER TABLE public.prompt_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can log usage events" ON public.prompt_usage_events;
CREATE POLICY "Anyone can log usage events"
  ON public.prompt_usage_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can read all events" ON public.prompt_usage_events;
CREATE POLICY "Service role can read all events"
  ON public.prompt_usage_events FOR SELECT
  USING (auth.role() = 'service_role');


-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT ON public.history TO authenticated;
GRANT INSERT, DELETE ON public.history TO authenticated;

GRANT ALL ON public.personal_library TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.prompt_favorites TO authenticated;

GRANT SELECT ON public.prompt_popularity TO anon, authenticated;
GRANT INSERT, UPDATE ON public.prompt_popularity TO anon, authenticated;

GRANT INSERT ON public.prompt_usage_events TO anon, authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION increment_prompt_popularity TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column TO authenticated;
