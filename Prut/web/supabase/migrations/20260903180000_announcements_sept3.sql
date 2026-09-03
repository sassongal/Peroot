-- "מה חדש", 2026-09-03: the rebuilt personal area (the languages note
-- already exists from 2026-09-02). Idempotent by title.

INSERT INTO public.announcements (title, body, href, href_label, starts_at, priority)
SELECT v.title, v.body, v.href, v.href_label, v.starts_at::timestamptz, v.priority
FROM (VALUES
  ('האזור האישי נבנה מחדש',
   'שמונה מסכים בארבע קבוצות, קריא במצב בהיר ובכהה, שפת פלט מועדפת, מראה, התנתקות מכל המכשירים והורדת הנתונים לפני מחיקה.',
   '/settings', 'לאזור האישי', '2026-09-03 12:00+03', 1)
) AS v(title, body, href, href_label, starts_at, priority)
WHERE NOT EXISTS (SELECT 1 FROM public.announcements a WHERE a.title = v.title);
