-- Split invitee name into first/last name for invitations.
-- Existing single-field values are placed in the first name column (Prénom).

alter table public.invitations
  add column if not exists invitee_first_name text,
  add column if not exists invitee_last_name text;

-- Backfill: put existing invitee_name entirely into the first name (Prénom).
update public.invitations
  set invitee_first_name = invitee_name
  where invitee_name is not null
    and invitee_first_name is null;
