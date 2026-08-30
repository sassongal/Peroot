-- The AchievementTracker awards 15 achievement ids, but the achievements
-- table only ever seeded 5. Once the jobs worker actually ran (2026-08-30)
-- every award of the other 10 failed with FK violation 23503
-- (Sentry JAVASCRIPT-NEXTJS-D/E). Seed the missing rows — idempotent.

INSERT INTO public.achievements (id, name_he, description_he, icon, category, points)
VALUES
  ('first_enhance',  'הצעד הראשון',     'ביצעת את שדרוג הפרומפט הראשון שלך',                'Sparkles',   'usage',      10),
  ('power_user_50',  'משתמש מתקדם',     'ביצעת 50 שדרוגי פרומפטים',                          'Flame',      'usage',      50),
  ('power_user_100', 'מקצוען פרומפטים', 'ביצעת 100 שדרוגי פרומפטים',                         'Trophy',     'usage',     100),
  ('streak_3',       'רצף ראשון',       'שלושה ימים רצופים של פעילות ב-Peroot',              'CalendarCheck', 'engagement', 20),
  ('streak_7',       'שבוע מושלם',      'שבעה ימים רצופים של פעילות ב-Peroot',               'CalendarHeart', 'engagement', 50),
  ('streak_30',      'חודש של התמדה',   'שלושים ימים רצופים של פעילות ב-Peroot',             'CalendarStar',  'engagement', 150),
  ('chain_master',   'רב-אמן שרשראות',  'הרצת שרשרת פרומפטים רב-שלבית',                      'Link2',      'feature',    40),
  ('share_first',    'משתף ראשון',      'שיתפת פרומפט לראשונה',                              'Share2',     'feature',    20),
  ('explorer',       'חוקר המודים',     'השתמשת בשלושה מודים שונים (טקסט / תמונה / וידאו…)', 'Compass',    'feature',    40),
  ('context_pro',    'אשף ההקשר',       'שדרגת פרומפט עם קובץ, תמונה או קישור כהקשר',        'Paperclip',  'feature',    40)
ON CONFLICT (id) DO NOTHING;
