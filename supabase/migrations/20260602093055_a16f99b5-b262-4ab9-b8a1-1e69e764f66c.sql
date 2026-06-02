-- ============ credit_wallets ============
CREATE TABLE public.credit_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.credit_wallets TO authenticated;
GRANT ALL ON public.credit_wallets TO service_role;

ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet"
ON public.credit_wallets FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER credit_wallets_set_updated_at
BEFORE UPDATE ON public.credit_wallets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ credit_ledger ============
CREATE TABLE public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL CHECK (reason IN ('purchase', 'reveal', 'refund', 'grant', 'adjustment')),
  lead_id uuid,
  stripe_session_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX credit_ledger_user_idx ON public.credit_ledger (user_id, created_at DESC);
CREATE UNIQUE INDEX credit_ledger_stripe_session_uniq
  ON public.credit_ledger (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ledger"
ON public.credit_ledger FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ============ marketplace_leads ============
CREATE TABLE public.marketplace_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  provider_id text NOT NULL,
  email text,
  full_name text,
  first_name text,
  last_name text,
  title text,
  company text,
  company_domain text,
  linkedin_url text,
  phone text,
  city text,
  country text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  cost_credits integer NOT NULL DEFAULT 0,
  revealed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, provider_id)
);

CREATE INDEX marketplace_leads_user_idx ON public.marketplace_leads (user_id, revealed_at DESC);

GRANT SELECT ON public.marketplace_leads TO authenticated;
GRANT ALL ON public.marketplace_leads TO service_role;

ALTER TABLE public.marketplace_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own marketplace leads"
ON public.marketplace_leads FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ============ spend_credits function ============
CREATE OR REPLACE FUNCTION public.spend_credits(
  _user_id uuid,
  _amount integer,
  _reason text,
  _lead_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Lock the wallet row to prevent concurrent overspend
  UPDATE public.credit_wallets
  SET balance = balance - _amount,
      updated_at = now()
  WHERE user_id = _user_id
    AND balance >= _amount
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason, lead_id, metadata)
  VALUES (_user_id, -_amount, v_new_balance, _reason, _lead_id, _metadata);

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.spend_credits(uuid, integer, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid, integer, text, uuid, jsonb) TO service_role;

-- ============ add_credits function (for Stripe webhook + grants) ============
CREATE OR REPLACE FUNCTION public.add_credits(
  _user_id uuid,
  _amount integer,
  _reason text,
  _stripe_session_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Idempotency: if this stripe session already credited, skip
  IF _stripe_session_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_ledger WHERE stripe_session_id = _stripe_session_id
  ) THEN
    SELECT balance INTO v_new_balance FROM public.credit_wallets WHERE user_id = _user_id;
    RETURN COALESCE(v_new_balance, 0);
  END IF;

  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (_user_id, _amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.credit_wallets.balance + _amount,
        updated_at = now()
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason, stripe_session_id, metadata)
  VALUES (_user_id, _amount, v_new_balance, _reason, _stripe_session_id, _metadata);

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.add_credits(uuid, integer, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, text, jsonb) TO service_role;

-- ============ Auto-create wallet on new user ============
CREATE OR REPLACE FUNCTION public.create_credit_wallet_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_credit_wallet_after_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_credit_wallet_for_new_user();

-- Backfill wallets for existing users
INSERT INTO public.credit_wallets (user_id, balance)
SELECT id, 0 FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;