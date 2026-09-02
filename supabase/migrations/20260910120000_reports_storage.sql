-- Colonne créateur pour les analyses collectives générées depuis Mon Espace
alter table public.team_analyses
  add column if not exists creator_user_id uuid;

-- URLs des rapports (PDF + image) stockés dans le bucket Storage `reports`
alter table public.results
  add column if not exists individual_pdf_url text,
  add column if not exists individual_image_url text;

alter table public.team_analyses
  add column if not exists pdf_url text,
  add column if not exists image_url text;

-- Bucket de stockage public pour les rapports générés
insert into storage.buckets (id, name, public)
values ('reports', 'reports', true)
on conflict (id) do update set public = true;
