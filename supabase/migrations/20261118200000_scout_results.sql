create table public.scout_results (
  id uuid primary key,
  completed_at timestamptz not null,
  members jsonb not null check (jsonb_typeof(members) = 'array' and jsonb_array_length(members) between 2 and 20)
);
create index scout_results_completed_idx on public.scout_results (completed_at desc);
alter table public.scout_results enable row level security;
revoke all on public.scout_results from public, anon, authenticated;
grant select, insert on public.scout_results to service_role;
