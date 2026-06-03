CREATE TABLE public.lead_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  filters jsonb NOT NULL,
  filters_hash text NOT NULL,
  total_results integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, filters_hash)
);

CREATE INDEX idx_lead_searches_user_updated ON public.lead_searches (user_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_searches TO authenticated;
GRANT ALL ON public.lead_searches TO service_role;

ALTER TABLE public.lead_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lead searches" ON public.lead_searches
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own lead searches" ON public.lead_searches
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own lead searches" ON public.lead_searches
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own lead searches" ON public.lead_searches
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER lead_searches_set_updated_at
  BEFORE UPDATE ON public.lead_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();