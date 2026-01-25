
-- Migration: Social Intelligence & Community Infrastructure
-- Description: Adds social metrics, public profile data, and leaderboard views

-- 1. Table: user_stats (Public Metrics)
CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    rank_title TEXT DEFAULT 'מחולל מתחיל',
    total_copies INTEGER DEFAULT 0,
    total_saves_by_others INTEGER DEFAULT 0,
    contribution_score INTEGER DEFAULT 0, -- Weighted score: copies * 1 + saves * 5 + points * 1
    is_public BOOLEAN DEFAULT true,
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: user_follows (Social Graph)
CREATE TABLE IF NOT EXISTS public.user_follows (
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- 3. View: global_leaderboard
CREATE OR REPLACE VIEW public.global_leaderboard AS
SELECT 
    p.id as user_id,
    p.full_name,
    p.avatar_url,
    s.rank_title,
    s.contribution_score,
    s.total_copies,
    s.total_saves_by_others
FROM public.profiles p
JOIN public.user_stats s ON p.id = s.user_id
WHERE s.is_public = true
ORDER BY s.contribution_score DESC;

-- 4. RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public user stats" ON public.user_stats FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage their own privacy and stats" ON public.user_stats FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view follows" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Users can manage their own follows" ON public.user_follows FOR ALL USING (auth.uid() = follower_id);

-- 5. Trigger: Initialize user_stats on new profile
CREATE OR REPLACE FUNCTION public.handle_new_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_stats
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_stats();

-- 6. Function: Update contribution score
CREATE OR REPLACE FUNCTION public.recalculate_user_contribution(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_stats
    SET contribution_score = (total_copies * 1) + (total_saves_by_others * 5) + 
                             (SELECT COALESCE(SUM(points), 0) FROM public.user_achievements ua JOIN public.achievements a ON ua.achievement_id = a.id WHERE ua.user_id = target_user_id),
        last_updated_at = NOW()
    WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
