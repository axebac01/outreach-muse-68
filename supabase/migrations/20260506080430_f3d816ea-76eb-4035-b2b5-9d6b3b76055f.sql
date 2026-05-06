ALTER TABLE public.tracking_sites ALTER COLUMN require_consent SET DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON public.visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen_at ON public.visitors(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_inbound_companies_last_seen_at ON public.inbound_companies(last_seen_at);