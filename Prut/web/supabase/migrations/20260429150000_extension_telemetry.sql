-- Append-only telemetry stream from the extension. Used to surface broken
-- selectors (selector_miss) and UX events without bloating usage_history.

create table if not exists public.extension_telemetry_events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  event text not null,
  site text,
  ext_version text,
  target_model text,
  latency_ms int,
  success boolean,
  chain_index int,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists extension_telemetry_event_created_idx
  on public.extension_telemetry_events (event, created_at desc);
create index if not exists extension_telemetry_user_idx
  on public.extension_telemetry_events (user_id, created_at desc);

alter table public.extension_telemetry_events enable row level security;
-- No anon/authenticated read or write policies — service-role only.
