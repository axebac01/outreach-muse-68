
-- 1. subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  price_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_env_status ON public.subscriptions(environment, status);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. plan_credit_grants (referensdata)
CREATE TABLE public.plan_credit_grants (
  price_id TEXT PRIMARY KEY,
  credits_per_month INTEGER NOT NULL,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month','year')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_credit_grants TO authenticated, anon;
GRANT ALL ON public.plan_credit_grants TO service_role;

ALTER TABLE public.plan_credit_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plan grants"
  ON public.plan_credit_grants FOR SELECT
  USING (true);

INSERT INTO public.plan_credit_grants (price_id, credits_per_month, billing_interval) VALUES
  ('starter_monthly', 250, 'month'),
  ('starter_yearly',  250, 'year'),
  ('growth_monthly',  1000, 'month'),
  ('growth_yearly',   1000, 'year'),
  ('scale_monthly',   3000, 'month'),
  ('scale_yearly',    3000, 'year');

-- 3. subscription_credit_grants (idempotens-logg för cron)
CREATE TABLE public.subscription_credit_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, period_start)
);
CREATE INDEX idx_subscription_credit_grants_user ON public.subscription_credit_grants(user_id);

GRANT SELECT ON public.subscription_credit_grants TO authenticated;
GRANT ALL ON public.subscription_credit_grants TO service_role;

ALTER TABLE public.subscription_credit_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own credit grants"
  ON public.subscription_credit_grants FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service role manages credit grants"
  ON public.subscription_credit_grants FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 4. has_active_subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid UUID,
  check_env TEXT DEFAULT 'live'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  );
$$;
