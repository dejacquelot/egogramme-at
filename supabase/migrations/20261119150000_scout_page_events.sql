alter table public.page_events
  drop constraint page_events_page_check,
  add constraint page_events_page_check check (page in ('duo', 'apel', 'scout'));
