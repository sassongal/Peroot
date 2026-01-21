create table if not exists prompt_popularity (
  prompt_id text primary key,
  count bigint not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function increment_prompt_popularity(prompt_id text, delta integer default 1)
returns bigint
language plpgsql
as $$
declare
  new_count bigint;
begin
  insert into prompt_popularity (prompt_id, count, updated_at)
  values (prompt_id, greatest(delta, 1), now())
  on conflict (prompt_id)
  do update set
    count = prompt_popularity.count + greatest(delta, 1),
    updated_at = now()
  returning count into new_count;

  return new_count;
end;
$$;
