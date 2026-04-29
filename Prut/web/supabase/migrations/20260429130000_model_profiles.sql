-- Extension v2 — model-aware enhancement profiles.
-- Each profile carries a system-prompt fragment, output-format rules, and
-- dimension-weight overrides that are layered onto the base engine for the
-- duration of one /api/enhance call.

create table if not exists public.model_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  display_name text not null,
  display_name_he text not null,
  host_match text[] not null default '{}',
  system_prompt_he text not null,
  output_format_rules jsonb not null default '{}'::jsonb,
  dimension_weights jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists model_profiles_slug_idx on public.model_profiles (slug) where is_active = true;
create index if not exists model_profiles_host_match_idx on public.model_profiles using gin (host_match);

alter table public.model_profiles enable row level security;

drop policy if exists "model_profiles_read_authenticated" on public.model_profiles;
create policy "model_profiles_read_authenticated"
  on public.model_profiles
  for select
  using (auth.role() = 'authenticated');

-- Writes are service-role only. No anon/authenticated insert/update/delete policies.

-- Seed: 3 day-one profiles. ON CONFLICT keeps existing rows untouched so
-- re-running the migration on a hot DB is safe.
insert into public.model_profiles
  (slug, display_name, display_name_he, host_match, system_prompt_he, output_format_rules, dimension_weights, sort_order)
values
  (
    'gpt-5',
    'ChatGPT (GPT-5)',
    'ChatGPT (GPT-5)',
    array['chatgpt.com', 'chat.openai.com'],
    'התאם את הפלט עבור GPT-5: פלט מובנה ב-Markdown עם כותרות ברורות (## כותרת ראשית, ### תת-כותרת). השתמש ברשימות ממוספרות לשלבים. הצג טבלאות כשיש נתונים השוואתיים.',
    '{"prefer":"markdown_headers","xml_tags":false,"max_length":null}'::jsonb,
    '{"structure":1.2,"specificity":1.1}'::jsonb,
    10
  ),
  (
    'claude-sonnet-4',
    'Claude Sonnet 4',
    'Claude Sonnet 4',
    array['claude.ai'],
    'התאם את הפלט עבור Claude Sonnet 4: עטוף קטעים מובנים בתגיות XML — `<context>...</context>`, `<task>...</task>`, `<constraints>...</constraints>`, `<output_format>...</output_format>`. הסבר את ההיגיון לפני המסקנה.',
    '{"prefer":"xml_tags","xml_tags":true,"max_length":null}'::jsonb,
    '{"reasoning":1.2,"structure":1.15}'::jsonb,
    20
  ),
  (
    'gemini-2.5',
    'Gemini 2.5',
    'Gemini 2.5',
    array['gemini.google.com'],
    'התאם את הפלט עבור Gemini 2.5: פתח עם תפקיד ומטרה מפורשים בשורה הראשונה. השתמש בנקודות תמציתיות. הגדר פורמט פלט מראש (JSON / טבלה / רשימה).',
    '{"prefer":"numbered_lists","xml_tags":false,"max_length":null}'::jsonb,
    '{"role_clarity":1.2,"output_format":1.15}'::jsonb,
    30
  )
on conflict (slug) do nothing;
