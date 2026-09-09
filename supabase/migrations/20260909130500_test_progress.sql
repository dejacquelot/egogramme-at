-- Progression du test égogramme, synchronisée avec le compte utilisateur.
-- Permet de retrouver ses réponses depuis n'importe quel appareil.

create table if not exists public.test_progress (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  answers        jsonb       not null default '[]'::jsonb,
  answered_count integer     not null default 0,
  updated_at     timestamptz not null default now()
);

-- Aucune policy : la table n'est accessible que via le service role,
-- utilisé exclusivement par la route serveur /api/test-progress.
alter table public.test_progress enable row level security;

grant all on public.test_progress to service_role;
