-- Invitations sans compte.
--
-- Jusqu'ici une invitation exigeait un compte authentifié (inviter_user_id).
-- Le compte devenait donc un péage placé AVANT que la personne ait vu la
-- moindre valeur de l'analyse à plusieurs.
--
-- Désormais l'invitation s'ancre sur le résultat de l'inviteur
-- (inviter_result_id, déjà présent). Le compte n'est demandé qu'au moment
-- d'ouvrir l'analyse duo, une fois que la seconde personne a répondu.

alter table public.invitations
  alter column inviter_user_id drop not null;

-- Adresse facultative, pour prévenir l'inviteur sans lui imposer un compte.
alter table public.invitations
  add column if not exists notify_email text;

-- Empreinte IP du créateur : garde anti-abus sur la création anonyme.
alter table public.invitations
  add column if not exists created_ip_hash text;

create index if not exists invitations_inviter_result_idx
  on public.invitations (inviter_result_id);

create index if not exists invitations_created_ip_idx
  on public.invitations (created_ip_hash, created_at);
