-- prompt_feedback: records thumbs up/down ratings after enhance
create table if not exists prompt_feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  rating       smallint not null check (rating in (1, -1)),
  input_text   text,
  enhanced_text text,
  capability_mode text,
  created_at   timestamptz not null default now()
);

create index if not exists prompt_feedback_user_id_idx on prompt_feedback(user_id);
create index if not exists prompt_feedback_created_at_idx on prompt_feedback(created_at desc);

-- RLS: users can only insert/read their own rows
alter table prompt_feedback enable row level security;

create policy "users insert own feedback"
  on prompt_feedback for insert
  with check (auth.uid() = user_id);

create policy "users select own feedback"
  on prompt_feedback for select
  using (auth.uid() = user_id);

-- Admin service role can read all
create policy "service role reads all"
  on prompt_feedback for select
  using (auth.role() = 'service_role');
