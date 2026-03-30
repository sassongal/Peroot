-- Add template support to personal library
-- Templates are prompts with {variable} placeholders that can be reused

ALTER TABLE public.personal_library ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.personal_library ADD COLUMN IF NOT EXISTS template_description TEXT;
ALTER TABLE public.personal_library ADD COLUMN IF NOT EXISTS template_variables TEXT[]; -- cached variable names

CREATE INDEX IF NOT EXISTS personal_library_is_template_idx ON public.personal_library (user_id, is_template) WHERE is_template = true;
