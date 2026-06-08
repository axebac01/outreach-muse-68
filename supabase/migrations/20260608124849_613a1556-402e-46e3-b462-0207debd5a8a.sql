
-- =====================================================================
-- Fas 1: Credit-buckets-modellen
-- =====================================================================

-- 1. credit_buckets-tabellen (källa till sanning)
CREATE TABLE public.credit_buckets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('plan', 'topup', 'grant', 'refund', 'adjustment')),
  amount_initial INTEGER NOT NULL CHECK (amount_initial > 0),
  amount_remaining INTEGER NOT NULL CHECK (amount_remaining >= 0),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  source_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credit_buckets_remaining_le_initial CHECK (amount_remaining <= amount_initial)
);

CREATE INDEX credit_buckets_user_active_idx
  ON public.credit_buckets (user_id, expires_at NULLS LAST, granted_at)
  WHERE amount_remaining > 0;

CREATE UNIQUE INDEX credit_buckets_source_ref_uniq
  ON public.credit_buckets (source_ref)
  WHERE source_ref IS NOT NULL;

GRANT SELECT ON public.credit_buckets TO authenticated;
GRANT ALL ON public.credit_buckets TO service_role;

ALTER TABLE public.credit_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own buckets"
  ON public.credit_buckets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER credit_buckets_set_updated_at
  BEFORE UPDATE ON public.credit_buckets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Hjälpare: räkna ut aktivt saldo och synka credit_wallets.balance
CREATE OR REPLACE FUNCTION public.recalc_wallet_balance(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount_remaining), 0)
    INTO v_total
    FROM public.credit_buckets
   WHERE user_id = _user_id
     AND amount_remaining > 0
     AND (expires_at IS NULL OR expires_at > now());

  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (_user_id, v_total)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = EXCLUDED.balance,
        updated_at = now();

  RETURN v_total;
END;
$$;

-- 3. Skriv om add_credits — bakåtkompatibel signatur, plus nya valfria param
DROP FUNCTION IF EXISTS public.add_credits(uuid, integer, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.add_credits(
  _user_id UUID,
  _amount INTEGER,
  _reason TEXT,
  _stripe_session_id TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb,
  _kind TEXT DEFAULT NULL,
  _expires_in_days INTEGER DEFAULT NULL,
  _source_ref TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
  v_kind TEXT;
  v_expires_at TIMESTAMPTZ;
  v_source_ref TEXT;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Källreferens för idempotens (Stripe-session vinner om båda angivna)
  v_source_ref := COALESCE(_stripe_session_id, _source_ref);

  -- Idempotens: bail om denna källa redan krediterat (via bucket eller ledger)
  IF v_source_ref IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.credit_buckets WHERE source_ref = v_source_ref
    ) OR EXISTS (
      SELECT 1 FROM public.credit_ledger WHERE stripe_session_id = v_source_ref
    ) THEN
      RETURN public.recalc_wallet_balance(_user_id);
    END IF;
  END IF;

  -- Härleda bucket-kind från reason om inte explicit
  v_kind := COALESCE(_kind, CASE _reason
    WHEN 'purchase' THEN 'topup'
    WHEN 'refund'   THEN 'refund'
    WHEN 'grant'    THEN 'grant'
    ELSE 'adjustment'
  END);

  -- Sätt expires_at — explicit param vinner, annars defaults per kind
  IF _expires_in_days IS NOT NULL THEN
    v_expires_at := now() + (_expires_in_days || ' days')::INTERVAL;
  ELSE
    v_expires_at := CASE v_kind
      WHEN 'plan'  THEN now() + INTERVAL '60 days'
      WHEN 'topup' THEN now() + INTERVAL '365 days'
      ELSE NULL  -- grant, refund, adjustment: ingen utgång
    END;
  END IF;

  INSERT INTO public.credit_buckets (
    user_id, kind, amount_initial, amount_remaining,
    expires_at, source_ref, metadata
  ) VALUES (
    _user_id, v_kind, _amount, _amount,
    v_expires_at, v_source_ref, _metadata
  );

  v_new_balance := public.recalc_wallet_balance(_user_id);

  INSERT INTO public.credit_ledger (
    user_id, delta, balance_after, reason, stripe_session_id, metadata
  ) VALUES (
    _user_id, _amount, v_new_balance, _reason, _stripe_session_id,
    _metadata || jsonb_build_object('bucket_kind', v_kind, 'expires_at', v_expires_at)
  );

  RETURN v_new_balance;
END;
$$;

-- 4. Skriv om spend_credits — drar FIFO från äldsta-utgår-först
DROP FUNCTION IF EXISTS public.spend_credits(uuid, integer, text, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.spend_credits(
  _user_id UUID,
  _amount INTEGER,
  _reason TEXT,
  _lead_id UUID DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available INTEGER;
  v_remaining_to_spend INTEGER := _amount;
  v_new_balance INTEGER;
  v_bucket RECORD;
  v_take INTEGER;
  v_drained_kinds JSONB := '[]'::jsonb;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Snabb-koll: räkna aktivt saldo (utan lås) först
  SELECT COALESCE(SUM(amount_remaining), 0)
    INTO v_available
    FROM public.credit_buckets
   WHERE user_id = _user_id
     AND amount_remaining > 0
     AND (expires_at IS NULL OR expires_at > now());

  IF v_available < _amount THEN
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001';
  END IF;

  -- Lås buckets i FIFO-ordning och dra
  FOR v_bucket IN
    SELECT id, amount_remaining, kind
      FROM public.credit_buckets
     WHERE user_id = _user_id
       AND amount_remaining > 0
       AND (expires_at IS NULL OR expires_at > now())
     ORDER BY expires_at NULLS LAST, granted_at ASC, id ASC
     FOR UPDATE
  LOOP
    EXIT WHEN v_remaining_to_spend = 0;
    v_take := LEAST(v_bucket.amount_remaining, v_remaining_to_spend);

    UPDATE public.credit_buckets
       SET amount_remaining = amount_remaining - v_take,
           updated_at = now()
     WHERE id = v_bucket.id;

    v_drained_kinds := v_drained_kinds || jsonb_build_object('kind', v_bucket.kind, 'amount', v_take);
    v_remaining_to_spend := v_remaining_to_spend - v_take;
  END LOOP;

  IF v_remaining_to_spend > 0 THEN
    -- Borde inte kunna hända pga snabbkollen ovan, men skydda mot race
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001';
  END IF;

  v_new_balance := public.recalc_wallet_balance(_user_id);

  INSERT INTO public.credit_ledger (
    user_id, delta, balance_after, reason, lead_id, metadata
  ) VALUES (
    _user_id, -_amount, v_new_balance, _reason, _lead_id,
    _metadata || jsonb_build_object('drained', v_drained_kinds)
  );

  RETURN v_new_balance;
END;
$$;

-- 5. Expiry-funktion (anropas av cron senare)
CREATE OR REPLACE FUNCTION public.expire_credit_buckets()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_user_id UUID;
  v_total_expired INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Hitta alla användare som har minst en bucket att gå ut
  FOR v_user_id, v_total_expired IN
    SELECT user_id, SUM(amount_remaining)::INTEGER
      FROM public.credit_buckets
     WHERE amount_remaining > 0
       AND expires_at IS NOT NULL
       AND expires_at <= now()
     GROUP BY user_id
  LOOP
    UPDATE public.credit_buckets
       SET amount_remaining = 0,
           updated_at = now()
     WHERE user_id = v_user_id
       AND amount_remaining > 0
       AND expires_at IS NOT NULL
       AND expires_at <= now();

    v_new_balance := public.recalc_wallet_balance(v_user_id);

    INSERT INTO public.credit_ledger (
      user_id, delta, balance_after, reason, metadata
    ) VALUES (
      v_user_id, -v_total_expired, v_new_balance, 'adjustment',
      jsonb_build_object('source', 'bucket_expiry')
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 6. Auto-refund vid hard bounce
CREATE OR REPLACE FUNCTION public.refund_credit_on_bounce()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_already_refunded BOOLEAN;
  v_was_revealed BOOLEAN;
  v_source_ref TEXT;
BEGIN
  IF NOT NEW.hard THEN
    RETURN NEW;
  END IF;

  -- Hitta motsvarande revealad lead för denna user + mejl
  SELECT id INTO v_lead
    FROM public.marketplace_leads
   WHERE user_id = NEW.user_id
     AND lower(email) = lower(NEW.email)
   LIMIT 1;

  IF v_lead.id IS NULL THEN
    -- Bounce på lead som aldrig kostat något (importerad CSV o.dyl.)
    RETURN NEW;
  END IF;

  -- Bara refund om vi faktiskt har debiterat user för denna lead
  SELECT EXISTS (
    SELECT 1 FROM public.credit_ledger
     WHERE user_id = NEW.user_id
       AND lead_id = v_lead.id
       AND reason = 'reveal'
  ) INTO v_was_revealed;

  IF NOT v_was_revealed THEN
    RETURN NEW;
  END IF;

  -- Idempotens-nyckel
  v_source_ref := 'bounce_refund:' || NEW.id::text;

  SELECT EXISTS (
    SELECT 1 FROM public.credit_buckets WHERE source_ref = v_source_ref
  ) INTO v_already_refunded;

  IF v_already_refunded THEN
    RETURN NEW;
  END IF;

  PERFORM public.add_credits(
    _user_id := NEW.user_id,
    _amount := 1,
    _reason := 'refund',
    _metadata := jsonb_build_object(
      'source', 'auto_bounce',
      'bounce_id', NEW.id,
      'email', NEW.email,
      'lead_id', v_lead.id
    ),
    _kind := 'refund',
    _source_ref := v_source_ref
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER bounces_auto_refund
  AFTER INSERT ON public.bounces
  FOR EACH ROW
  EXECUTE FUNCTION public.refund_credit_on_bounce();

-- 7. Backfill: konvertera befintliga balances till grant-buckets
INSERT INTO public.credit_buckets (
  user_id, kind, amount_initial, amount_remaining,
  granted_at, expires_at, source_ref, metadata
)
SELECT
  w.user_id,
  'grant',
  w.balance,
  w.balance,
  w.created_at,
  NULL,  -- befintliga saldon får ingen utgång
  'backfill:' || w.user_id::text,
  jsonb_build_object('source', 'phase1_backfill', 'original_balance', w.balance)
FROM public.credit_wallets w
WHERE w.balance > 0
ON CONFLICT (source_ref) WHERE source_ref IS NOT NULL DO NOTHING;
