
-- Migration: Advanced Public Library System
-- Description: Dynamic storage for public library prompts and categories

-- 1. Table: library_categories
CREATE TABLE IF NOT EXISTS public.library_categories (
    id TEXT PRIMARY KEY, -- e.g. 'marketing'
    name_en TEXT NOT NULL,
    name_he TEXT NOT NULL,
    icon TEXT, -- Lucide icon name
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: public_library_prompts
CREATE TABLE IF NOT EXISTS public.public_library_prompts (
    id TEXT PRIMARY KEY, -- e.g. 'ahp_001'
    title TEXT NOT NULL,
    category_id TEXT REFERENCES public.library_categories(id),
    use_case TEXT,
    prompt TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    output_format TEXT,
    quality_checks TEXT[] DEFAULT '{}',
    capability_mode TEXT DEFAULT 'STANDARD',
    source_metadata JSONB DEFAULT '{}', -- name, url, license, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS Policies
ALTER TABLE public.library_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_library_prompts ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Public library is readable by all" ON public.library_categories FOR SELECT USING (true);
CREATE POLICY "Public prompts are readable by all" ON public.public_library_prompts FOR SELECT USING (is_active = true);

-- Only admins can modify (Assuming we have a user_roles table or similar)
-- Using a helper function for admin check if exists, otherwise placeholder
CREATE POLICY "Admins can manage categories" ON public.library_categories FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage public prompts" ON public.public_library_prompts FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 4. Initial Categories Seed
INSERT INTO public.library_categories (id, name_en, name_he, icon)
VALUES 
    ('marketing', 'Marketing', 'שיווק', 'Megaphone'),
    ('sales', 'Sales', 'מכירות', 'BadgeDollarSign'),
    ('social', 'Social Media', 'רשתות חברתיות', 'Share2'),
    ('dev', 'Development', 'פיתוח', 'Code2'),
    ('education', 'Education', 'חינוך והדרכה', 'GraduationCap'),
    ('creative', 'Creative', 'יצירתיות', 'Palette'),
    ('general', 'General', 'כללי', 'Box')
ON CONFLICT (id) DO NOTHING;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_public_prompts_cat ON public.public_library_prompts(category_id);
CREATE INDEX IF NOT EXISTS idx_public_prompts_active ON public.public_library_prompts(is_active);
