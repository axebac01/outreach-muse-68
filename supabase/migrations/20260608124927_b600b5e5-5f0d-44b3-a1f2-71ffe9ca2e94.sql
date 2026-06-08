
CREATE OR REPLACE FUNCTION public.create_credit_wallet_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_already_granted BOOLEAN;
BEGIN
  -- Idempotent — kör bara grant om wallet ännu inte finns
  SELECT EXISTS (
    SELECT 1 FROM public.credit_wallets WHERE user_id = NEW.id
  ) INTO v_already_granted;

  IF v_already_granted THEN
    RETURN NEW;
  END IF;

  PERFORM public.add_credits(
    _user_id := NEW.id,
    _amount := 25,
    _reason := 'grant',
    _metadata := jsonb_build_object('source', 'forever_free_signup'),
    _kind := 'grant',
    _source_ref := 'signup_grant:' || NEW.id::text
  );

  RETURN NEW;
END;
$$;
