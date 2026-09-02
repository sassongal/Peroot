-- "מה חדש": one line under the "הידעת?" banner on the home page (owner
-- decision, 2026-09-02, spec section D), fed by this table instead of a
-- hard-coded string, so a launch note is an admin edit and not a deploy.
--
-- Public read of live rows only; admin writes. Dismissals are per browser
-- (localStorage), not stored here.

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  href text,
  href_label text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'guests', 'users', 'pro')),
  lang text NOT NULL DEFAULT 'he' CHECK (lang IN ('he', 'en', 'ar', 'ru')),
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_live
  ON public.announcements (is_active, starts_at DESC)
  WHERE is_active = true;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Live announcements are public" ON public.announcements;
CREATE POLICY "Live announcements are public" ON public.announcements
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now())
  );

DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;
CREATE POLICY "Admins manage announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

-- updated_at upkeep (the same shape the other tables use)
CREATE OR REPLACE FUNCTION public.touch_announcements_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_announcements_updated_at();

-- The first note (spec C.15): the languages launch. Seeded once.
INSERT INTO public.announcements (title, body, href, href_label, priority)
SELECT
  'פירוט מדבר עכשיו גם ערבית, רוסית ואנגלית',
  'בוחרים שפה ליד בחירת המצב, והפרומפט המשודרג נכתב בה: מבנה, דוגמאות וכותרות בשפה עצמה. גם המדרג קורא אותה.',
  '/whats-new',
  'מה עוד חדש',
  10
WHERE NOT EXISTS (
  SELECT 1 FROM public.announcements WHERE title = 'פירוט מדבר עכשיו גם ערבית, רוסית ואנגלית'
);
