-- Comptage des clics sur le lien "Comment ça marche avec un binôme" affiché
-- sur la page d'accueil (scénario A). Même schéma minimal que share_events :
-- aucune donnée personnelle, juste une date pour alimenter une courbe dans
-- /statistiques.
create table if not exists public.binome_info_clicks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index if not exists binome_info_clicks_created_at_idx
  on public.binome_info_clicks (created_at);

alter table public.binome_info_clicks enable row level security;
grant all on public.binome_info_clicks to service_role;
