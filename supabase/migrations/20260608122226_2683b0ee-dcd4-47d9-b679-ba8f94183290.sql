
ALTER TABLE public.credit_wallets ALTER COLUMN balance SET DEFAULT 50;

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
  VALUES (NEW.id, 50)
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted THEN
    INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason, metadata)
    VALUES (NEW.id, 50, 50, 'grant', jsonb_build_object('source', 'forever_free_signup'));
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT user_id FROM public.credit_wallets WHERE balance = 0 LOOP
    UPDATE public.credit_wallets SET balance = 50, updated_at = now() WHERE user_id = r.user_id;
    INSERT INTO public.credit_ledger (user_id, delta, balance_after, reason, metadata)
    VALUES (r.user_id, 50, 50, 'grant', jsonb_build_object('source', 'forever_free_backfill'));
  END LOOP;
END $$;
