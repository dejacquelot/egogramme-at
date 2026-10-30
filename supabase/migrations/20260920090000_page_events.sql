-- Fréquentation des pages /duo et /apel : visites, démarrages et rapports.
-- Aucune donnée personnelle : un hash d'adresse IP salé, comme `visits`.
-- L'index unique compte au plus un événement de chaque type par visiteur et par jour.
create table if not exists public.page_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_date date not null default (now() at time zone 'utc')::date,
  page text not null check (page in ('duo', 'apel')),
  kind text not null check (kind in ('visit', 'start', 'report')),
  visitor_hash text not null
);

create unique index if not exists page_events_unique_idx
  on public.page_events (page, kind, event_date, visitor_hash);
create index if not exists page_events_created_at_idx
  on public.page_events (created_at);

alter table public.page_events enable row level security;
grant all on public.page_events to service_role;
