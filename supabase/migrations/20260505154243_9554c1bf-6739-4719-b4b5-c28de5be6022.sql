
-- tracking_sites: registered websites with site_key for snippet
CREATE TABLE public.tracking_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  site_key TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  require_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tracking_sites_user ON public.tracking_sites(user_id);
CREATE INDEX idx_tracking_sites_key ON public.tracking_sites(site_key);

ALTER TABLE public.tracking_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tracking sites" ON public.tracking_sites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tracking sites" ON public.tracking_sites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tracking sites" ON public.tracking_sites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tracking sites" ON public.tracking_sites FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_tracking_sites_updated BEFORE UPDATE ON public.tracking_sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- inbound_companies: companies that visited a tracked site
CREATE TABLE public.inbound_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  name TEXT,
  industry TEXT,
  size TEXT,
  country TEXT,
  city TEXT,
  logo_url TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  visit_count INTEGER NOT NULL DEFAULT 0,
  is_known_lead BOOLEAN NOT NULL DEFAULT false,
  matched_lead_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, domain)
);
CREATE INDEX idx_inbound_companies_user ON public.inbound_companies(user_id);
CREATE INDEX idx_inbound_companies_last_seen ON public.inbound_companies(user_id, last_seen_at DESC);

ALTER TABLE public.inbound_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own inbound companies" ON public.inbound_companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own inbound companies" ON public.inbound_companies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own inbound companies" ON public.inbound_companies FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_inbound_companies_updated BEFORE UPDATE ON public.inbound_companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- visitors: unique visitor (cookie based)
CREATE TABLE public.visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  site_id UUID NOT NULL,
  visitor_id TEXT NOT NULL,
  company_id UUID,
  email TEXT,
  lead_id UUID,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  visit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, visitor_id)
);
CREATE INDEX idx_visitors_user ON public.visitors(user_id);
CREATE INDEX idx_visitors_company ON public.visitors(company_id);

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own visitors" ON public.visitors FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER trg_visitors_updated BEFORE UPDATE ON public.visitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- visits: every page view
CREATE TABLE public.visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  site_id UUID NOT NULL,
  visitor_id TEXT NOT NULL,
  company_id UUID,
  url TEXT NOT NULL,
  path TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  country TEXT,
  city TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visits_user_created ON public.visits(user_id, created_at DESC);
CREATE INDEX idx_visits_company ON public.visits(company_id, created_at DESC);
CREATE INDEX idx_visits_visitor ON public.visits(site_id, visitor_id, created_at DESC);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own visits" ON public.visits FOR SELECT USING (auth.uid() = user_id);

-- inbound_notifications: when known leads visit
CREATE TABLE public.inbound_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  lead_id UUID,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbound_notif_user ON public.inbound_notifications(user_id, created_at DESC);

ALTER TABLE public.inbound_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own inbound notifications" ON public.inbound_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own inbound notifications" ON public.inbound_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own inbound notifications" ON public.inbound_notifications FOR DELETE USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbound_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbound_companies;
