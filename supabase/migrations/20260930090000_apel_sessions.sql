-- Séances du bureau APEL, enregistrées sans prénom ni nom : les participants
-- sont identifiés par leur seule fonction. `client_key` rend l'enregistrement
-- idempotent (une séance = une ligne, mise à jour si on la renvoie).
create table if not exists public.apel_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_key text not null unique,
  present_count integer not null,
  members jsonb not null,
  collective text,
  agreements jsonb not null default '[]'::jsonb
);

create index if not exists apel_sessions_created_at_idx
  on public.apel_sessions (created_at desc);

alter table public.apel_sessions enable row level security;
grant all on public.apel_sessions to service_role;
