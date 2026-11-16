-- Identifiants aleatoires et metadonnees techniques uniquement.
-- Les reprises HTTP gardent le meme id ; chaque telechargement PDF en a un nouveau.
create table if not exists public.orientation_events (
  id uuid primary key,
  journey_id uuid not null,
  kind text not null check (kind in (
    'visit', 'started', 'block_completed', 'test_completed', 'parent_opened',
    'plan_ready', 'pdf_downloaded', 'ai_requested', 'ai_completed', 'ai_failed'
  )),
  block smallint check (block between 1 and 6),
  attempt_id uuid,
  duration_ms integer check (duration_ms >= 0),
  created_at timestamptz not null default now(),
  check ((kind = 'block_completed') = (block is not null)),
  check ((kind in ('ai_requested', 'ai_completed', 'ai_failed')) = (attempt_id is not null)),
  check ((kind in ('ai_completed', 'ai_failed')) = (duration_ms is not null))
);

create index if not exists orientation_events_created_at_idx
  on public.orientation_events (created_at, id);
create index if not exists orientation_events_kind_created_at_idx
  on public.orientation_events (kind, created_at);

alter table public.orientation_events enable row level security;
revoke all on public.orientation_events from anon, authenticated;
grant select, insert on public.orientation_events to service_role;
