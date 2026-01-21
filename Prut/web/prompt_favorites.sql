create table if not exists prompt_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('library', 'personal')),
  item_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

create index if not exists prompt_favorites_user_idx
  on prompt_favorites (user_id, item_type);
