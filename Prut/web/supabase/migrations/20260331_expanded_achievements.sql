-- Expanded achievements for deeper engagement
-- Adds 10 new achievements covering: first use, power usage, streaks, features

INSERT INTO public.achievements (id, name_he, description_he, icon, category, points)
VALUES
    ('first_enhance', 'צעד ראשון', 'שדרגת את הפרומפט הראשון שלך', 'Sparkles', 'usage', 10),
    ('power_user_50', 'משתמש מתקדם', 'שדרגת 50 פרומפטים', 'Flame', 'usage', 50),
    ('power_user_100', 'מאסטר פרומפטים', 'שדרגת 100 פרומפטים', 'Trophy', 'usage', 100),
    ('streak_3', 'התמדה של 3 ימים', 'השתמשת ב-Peroot 3 ימים רצופים', 'Calendar', 'engagement', 20),
    ('streak_7', 'שבוע של מצוינות', 'השתמשת ב-Peroot 7 ימים רצופים', 'Star', 'engagement', 40),
    ('streak_30', 'חודש של השראה', 'השתמשת ב-Peroot 30 ימים רצופים', 'Crown', 'engagement', 100),
    ('chain_master', 'שרשרת ראשונה', 'הרצת שרשרת פרומפטים בפעם הראשונה', 'Link', 'features', 30),
    ('share_first', 'שיתוף ראשון', 'שיתפת פרומפט בפעם הראשונה', 'Share2', 'social', 20),
    ('explorer', 'חוקר מצבים', 'השתמשת ב-3 מצבי עבודה שונים לפחות', 'Compass', 'features', 30),
    ('context_pro', 'מומחה הקשר', 'צירפת קובץ, קישור או תמונה כ-context', 'FileText', 'features', 25)
ON CONFLICT (id) DO NOTHING;
