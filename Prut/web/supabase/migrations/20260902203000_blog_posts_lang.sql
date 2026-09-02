-- Languages spec B7.22: a post has a language. Every existing post is
-- Hebrew; the Hebrew surfaces (blog index, home teaser, RSS, sitemap, the
-- public list API) filter on it so a future Arabic or Russian post does not
-- land in the Hebrew feed. Idempotent.

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'he';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_lang_check'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_lang_check CHECK (lang IN ('he', 'en', 'ar', 'ru'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_blog_posts_lang_published
  ON public.blog_posts (lang, published_at DESC)
  WHERE status = 'published';
