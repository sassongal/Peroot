-- Blog posts table for Supabase-driven CMS
CREATE TABLE IF NOT EXISTS blog_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    slug text UNIQUE NOT NULL,
    title text NOT NULL,
    content text NOT NULL DEFAULT '',
    excerpt text,
    meta_title text,
    meta_description text,
    thumbnail_url text,
    category text DEFAULT 'מדריכים',
    tags text[] DEFAULT '{}',
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    author text DEFAULT 'Peroot',
    read_time text,
    published_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public read for published posts
CREATE POLICY "Anyone can read published posts"
ON blog_posts FOR SELECT
USING (status = 'published');

-- Admin full access
CREATE POLICY "Admins can do everything"
ON blog_posts FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);

-- Seed existing blog post
INSERT INTO blog_posts (slug, title, excerpt, meta_title, meta_description, category, status, read_time, published_at)
VALUES (
    'how-to-write-good-prompt',
    'איך לכתוב פרומפט טוב — המדריך המלא',
    '5 עקרונות שיהפכו כל פרומפט שלכם ממשהו בסיסי לפרומפט מקצועי שמוציא תוצאות מדויקות מ-ChatGPT, Claude ו-Gemini.',
    'איך לכתוב פרומפט טוב — המדריך המלא | Peroot',
    '5 עקרונות שיהפכו כל פרומפט שלכם לפרומפט מקצועי',
    'מדריכים',
    'published',
    '5 דקות קריאה',
    '2026-03-10'
) ON CONFLICT (slug) DO NOTHING;
