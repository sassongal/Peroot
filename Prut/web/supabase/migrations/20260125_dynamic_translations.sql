-- Migration: Dynamic Translations Table
CREATE TABLE IF NOT EXISTS public.translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lang TEXT NOT NULL CHECK (lang IN ('he', 'en')),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lang, key)
);

-- Index for fast lookup in I18n Context
CREATE INDEX IF NOT EXISTS translations_lang_idx ON public.translations(lang);

-- RLS
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read translations" ON public.translations FOR SELECT USING (true);
CREATE POLICY "Only admins can manage translations" ON public.translations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );
