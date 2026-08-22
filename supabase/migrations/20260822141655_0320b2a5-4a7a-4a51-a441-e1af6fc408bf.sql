REVOKE SELECT ON public.results FROM anon, authenticated;
GRANT SELECT (id, created_at) ON public.results TO anon, authenticated;
GRANT ALL ON public.results TO service_role;