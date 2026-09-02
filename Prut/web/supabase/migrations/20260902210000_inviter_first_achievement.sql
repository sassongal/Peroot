-- Referral loop, master plan 3.8 / languages spec A: the inviter earns an
-- achievement the first time a friend they brought makes an enhancement
-- (the same moment the bonus is granted). Awarded by AchievementTracker.
-- Idempotent.

INSERT INTO public.achievements (id, name_he, description_he, icon, category, points)
VALUES
  ('inviter_first', 'מזמין ראשון', 'חבר שהזמנת ביצע את השדרוג הראשון שלו', 'UserPlus', 'engagement', 30)
ON CONFLICT (id) DO NOTHING;
