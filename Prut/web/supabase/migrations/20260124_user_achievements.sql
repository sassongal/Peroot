
-- Migration: User Achievements & Gamification
-- Description: Sets up the structure for user badges and milestones

-- 1. Table for available Achievement Definitions
CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY, -- e.g., 'prompt_architect_1'
    name_he TEXT NOT NULL,
    description_he TEXT NOT NULL,
    icon TEXT NOT NULL, -- Lucide icon name or emoji
    category TEXT NOT NULL, -- 'library', 'intelligence', 'usage'
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table for User-unlocked Achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

-- 3. Seed initial achievements
INSERT INTO public.achievements (id, name_he, description_he, icon, category, points)
VALUES 
    ('pioneer', 'חלוץ פירוט', 'השלמת שלב ה-Onboarding בהצלחה', 'Rocket', 'system', 10),
    ('architect_1', 'אדריכל מתחיל', 'שמרת את 3 הפרומפטים הראשונים שלך בספריה', 'Layout', 'library', 20),
    ('architect_2', 'מתכנן ערים', 'שמרת 10 פרומפטים בספריה האישית', 'Building2', 'library', 50),
    ('style_explorer', 'חוקר סגנונות', 'ביצעת ניתוח אישיות בפעם הראשונה', 'Brain', 'intelligence', 30),
    ('placeholder_pro', 'אשף ה-Placeholders', 'השתמשת במשתנים {variable} ב-5 פרומפטים שונים', 'Zap', 'usage', 40)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view their own unlocked achievements" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 5. Helper function to award achievements safely
CREATE OR REPLACE FUNCTION award_achievement(target_user_id UUID, ach_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (target_user_id, ach_id)
    ON CONFLICT DO NOTHING;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
