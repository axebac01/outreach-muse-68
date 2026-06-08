
ALTER TABLE public.credit_wallets ALTER COLUMN balance SET DEFAULT 25;

CREATE OR REPLACE FUNCTION public.create_credit_wallet_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted boolean := false;
BEGIN
  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (NEW.id, 25)
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted THEN
    INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason, metadata)
    VALUES (NEW.id, 25, 25, 'grant', jsonb_build_object('source', 'forever_free_signup'));
  END IF;

  RETURN NEW;
END;
$$;

-- Normalisera saldon till nya 1:1-modellen.
-- Endast wallets utan köp (bara grants i ledger) får sitt saldo nedrullat till 25.
-- Användare som har spenderat eller köpt credits lämnas orörda.
DO $$
DECLARE
  r record;
  v_delta integer;
BEGIN
  FOR r IN
    SELECT w.user_id, w.balance
    FROM public.credit_wallets w
    WHERE w.balance > 25
      AND NOT EXISTS (
        SELECT 1 FROM public.credit_ledger l
        WHERE l.user_id = w.user_id
          AND l.reason IN ('purchase', 'reveal')
      )
  LOOP
    v_delta := 25 - r.balance;
    UPDATE public.credit_wallets
      SET balance = 25, updated_at = now()
      WHERE user_id = r.user_id;
    INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason, metadata)
    VALUES (
      r.user_id,
      v_delta,
      25,
      'adjustment',
      jsonb_build_object('source', 'credit_model_v2_normalize', 'previous_balance', r.balance)
    );
  END LOOP;
END $$;
