
ALTER TABLE public.tracking_sites
  ADD COLUMN IF NOT EXISTS last_ping_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_ping_url TEXT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_sites;
