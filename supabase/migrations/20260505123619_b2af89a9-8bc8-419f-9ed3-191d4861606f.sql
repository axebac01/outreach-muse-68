-- Enable scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Per-inbox warmup + caps
CREATE TABLE public.email_account_sending_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  warmup_enabled BOOLEAN NOT NULL DEFAULT true,
  warmup_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  daily_cap_override INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_account_sending_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sending limits" ON public.email_account_sending_limits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sending limits" ON public.email_account_sending_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sending limits" ON public.email_account_sending_limits
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sending limits" ON public.email_account_sending_limits
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_sending_limits_updated_at
  BEFORE UPDATE ON public.email_account_sending_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bounces
CREATE TABLE public.bounces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  reason TEXT,
  hard BOOLEAN NOT NULL DEFAULT true,
  bounced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bounces_user_email ON public.bounces (user_id, email);

ALTER TABLE public.bounces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bounces" ON public.bounces
  FOR SELECT USING (auth.uid() = user_id);

-- Backfill warmup rows for existing accounts
INSERT INTO public.email_account_sending_limits (email_account_id, user_id, warmup_started_at)
SELECT id, user_id, created_at FROM public.email_accounts
ON CONFLICT (email_account_id) DO NOTHING;

-- Auto-create warmup row when new email account added
CREATE OR REPLACE FUNCTION public.handle_new_email_account()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.email_account_sending_limits (email_account_id, user_id, warmup_started_at)
  VALUES (NEW.id, NEW.user_id, now())
  ON CONFLICT (email_account_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_email_account_created
  AFTER INSERT ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_email_account();