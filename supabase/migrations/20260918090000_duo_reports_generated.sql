-- Comptage des rapports de binôme générés sans compte (H3), distincts des
-- rapports générés depuis Mon Espace. Même schéma minimal que
-- binome_info_clicks : aucune donnée personnelle, juste une date pour
-- alimenter une courbe dans /statistiques.
create table if not exists public.duo_reports_generated (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index if not exists duo_reports_generated_created_at_idx
  on public.duo_reports_generated (created_at);

alter table public.duo_reports_generated enable row level security;
grant all on public.duo_reports_generated to service_role;
