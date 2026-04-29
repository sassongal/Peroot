-- Track which cost-funnel stage resolved each /api/enhance call.
-- 1 = local score gate (no LLM), 2 = cache hit, 3 = LLM call.
-- Column lives on public.history (the production table; the spec called it
-- usage_history, but the canonical table name in this codebase is `history`).

alter table public.history
  add column if not exists cost_funnel_stage smallint
    check (cost_funnel_stage between 1 and 3);

create index if not exists history_funnel_stage_idx
  on public.history (cost_funnel_stage, created_at desc)
  where cost_funnel_stage is not null;
