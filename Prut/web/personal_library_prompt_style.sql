alter table public.personal_library
  add column if not exists prompt_style text;
