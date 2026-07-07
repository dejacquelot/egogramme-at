
CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visit_date, ip_hash)
);
CREATE INDEX visits_visit_date_idx ON public.visits (visit_date);
GRANT SELECT ON public.visits TO anon, authenticated;
GRANT ALL ON public.visits TO service_role;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read visits" ON public.visits FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  scores jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX results_created_at_idx ON public.results (created_at);
CREATE INDEX results_ip_hash_idx ON public.results (ip_hash);
GRANT SELECT ON public.results TO anon, authenticated;
GRANT ALL ON public.results TO service_role;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read results" ON public.results FOR SELECT TO anon, authenticated USING (true);
