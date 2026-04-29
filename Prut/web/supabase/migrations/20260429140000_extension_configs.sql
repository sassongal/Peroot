-- Single-row config table read by /api/extension-config. Admins edit this row
-- to push selector / feature-flag changes to the extension within the 24h
-- client cache window — no Chrome Web Store review needed.

create table if not exists public.extension_configs (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default false,
  version text not null,
  cache_version int not null default 1,
  selectors jsonb not null,
  feature_flags jsonb not null default '{}'::jsonb,
  notes text,
  updated_at timestamptz not null default now()
);

create unique index if not exists extension_configs_one_active
  on public.extension_configs (is_active) where is_active = true;

alter table public.extension_configs enable row level security;

drop policy if exists "extension_configs_read_authenticated" on public.extension_configs;
create policy "extension_configs_read_authenticated"
  on public.extension_configs
  for select
  using (auth.role() = 'authenticated');

insert into public.extension_configs (is_active, version, cache_version, selectors, feature_flags, notes)
values (
  true,
  '2026-04-29-1',
  1,
  jsonb_build_object(
    'chatgpt', jsonb_build_object(
      'hosts', array['chatgpt.com','chat.openai.com'],
      'input', array['#prompt-textarea','div[contenteditable=''true''][id=''prompt-textarea'']','textarea[data-id=''root'']'],
      'send_button', array['button[data-testid=''send-button'']','button[aria-label=''Send prompt'']'],
      'composer', array['form.stretch','form[class*=''composer'']','main form'],
      'profile_slug', 'gpt-5'
    ),
    'claude', jsonb_build_object(
      'hosts', array['claude.ai'],
      'input', array['div.ProseMirror[contenteditable=''true'']','div[contenteditable=''true''][data-placeholder]','fieldset textarea','textarea'],
      'send_button', array['button[aria-label=''Send Message'']','button[data-testid=''send-message'']'],
      'composer', array['fieldset','div[class*=''composer'']','form'],
      'profile_slug', 'claude-sonnet-4'
    ),
    'gemini', jsonb_build_object(
      'hosts', array['gemini.google.com'],
      'input', array['rich-textarea .ql-editor','div.ql-editor[contenteditable=''true'']','div[contenteditable=''true''][aria-label*=''prompt'' i]'],
      'send_button', array['button[aria-label*=''Send'' i]','button[data-test-id=''send-button'']'],
      'composer', array['input-area-v2','rich-textarea','form'],
      'profile_slug', 'gemini-2.5'
    )
  ),
  jsonb_build_object(
    'score_gate_threshold', 80,
    'cache_ttl_hours', 24,
    'inline_chips_enabled', true,
    'quick_lib_enabled', true,
    'quick_lib_hotkey', 'Alt+Shift+L'
  ),
  'Initial seed for extension v2.0.0'
)
on conflict do nothing;
