create table public.report_downloads (
  id uuid primary key,
  created_at timestamptz not null default now(),
  source text not null check (source in ('solo','duo','apel','scout','espace','admin')),
  format text not null check (format in ('pdf','png'))
);
create index report_downloads_created_idx on public.report_downloads (created_at);
alter table public.report_downloads enable row level security;
revoke all on public.report_downloads from public, anon, authenticated;
grant select, insert on public.report_downloads to service_role;

-- Orientation already records one event per PDF download, including repeat exports.
create function public.report_download_counts(since_at timestamptz)
returns table (source text, format text, total bigint)
language sql stable security invoker set search_path = '' as $$
  select d.source, d.format, count(*) from public.report_downloads d
  where d.created_at >= since_at group by d.source, d.format
  union all
  select 'orientation', 'pdf', count(*) from public.orientation_events o
  where o.kind = 'pdf_downloaded' and o.created_at >= since_at;
$$;
revoke all on function public.report_download_counts(timestamptz) from public, anon, authenticated;
grant execute on function public.report_download_counts(timestamptz) to service_role;
