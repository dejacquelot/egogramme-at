-- Journal d'audit minimal des suppressions de compte (droit à l'oubli RGPD).
--
-- Ne conserve AUCUNE donnée personnelle de l'utilisateur supprimé (ni email,
-- ni nom) : uniquement la preuve qu'une suppression a eu lieu, par qui et
-- quand, avec le nombre de lignes purgées dans chaque table. Suffisant pour
-- répondre à un contrôle CNIL sans recréer un stock de données à protéger.
create table if not exists public.admin_deletion_log (
  id uuid primary key default gen_random_uuid(),
  deleted_user_id uuid not null,
  requested_by text not null,
  results_deleted integer not null default 0,
  invitations_deleted integer not null default 0,
  team_analyses_deleted integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.admin_deletion_log enable row level security;
grant all on public.admin_deletion_log to service_role;
