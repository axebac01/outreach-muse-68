
-- 1) get_user_plan
CREATE OR REPLACE FUNCTION public.get_user_plan(user_uuid uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price_id text;
BEGIN
  SELECT price_id INTO v_price_id
  FROM public.subscriptions
  WHERE user_id = user_uuid
    AND (
      (status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
      OR (status = 'canceled' AND current_period_end > now())
    )
  ORDER BY
    CASE
      WHEN price_id LIKE 'scale_%'   THEN 1
      WHEN price_id LIKE 'growth_%'  THEN 2
      WHEN price_id LIKE 'starter_%' THEN 3
      ELSE 4
    END,
    created_at DESC
  LIMIT 1;

  IF v_price_id IS NULL THEN
    RETURN 'free';
  END IF;

  RETURN CASE
    WHEN v_price_id LIKE 'starter_%' THEN 'starter'
    WHEN v_price_id LIKE 'growth_%'  THEN 'growth'
    WHEN v_price_id LIKE 'scale_%'   THEN 'scale'
    ELSE 'free'
  END;
END;
$$;

-- 2) get_plan_limit
CREATE OR REPLACE FUNCTION public.get_plan_limit(user_uuid uuid, resource text)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text := public.get_user_plan(user_uuid);
BEGIN
  RETURN CASE resource
    WHEN 'email_accounts' THEN CASE v_plan
      WHEN 'free' THEN 1
      WHEN 'starter' THEN 3
      WHEN 'growth' THEN 10
      WHEN 'scale' THEN -1
      ELSE 1
    END
    WHEN 'campaigns' THEN CASE v_plan
      WHEN 'free' THEN 1
      ELSE -1
    END
    WHEN 'daily_sends_per_account' THEN CASE v_plan
      WHEN 'free' THEN 50
      WHEN 'starter' THEN 200
      WHEN 'growth' THEN 500
      WHEN 'scale' THEN 1000
      ELSE 50
    END
    WHEN 'inbox_ai' THEN CASE v_plan
      WHEN 'growth' THEN 1
      WHEN 'scale' THEN 1
      ELSE 0
    END
    ELSE 0
  END;
END;
$$;

-- 3) Trigger: enforce_email_account_limit
CREATE OR REPLACE FUNCTION public.enforce_email_account_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := public.get_plan_limit(NEW.user_id, 'email_accounts');
  v_count integer;
BEGIN
  IF v_limit < 0 THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.email_accounts
  WHERE user_id = NEW.user_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'plan_limit_exceeded:email_accounts:%', v_limit USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_email_account_limit_trigger ON public.email_accounts;
CREATE TRIGGER enforce_email_account_limit_trigger
BEFORE INSERT ON public.email_accounts
FOR EACH ROW EXECUTE FUNCTION public.enforce_email_account_limit();

-- 4) Trigger: enforce_campaign_limit
CREATE OR REPLACE FUNCTION public.enforce_campaign_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := public.get_plan_limit(NEW.user_id, 'campaigns');
  v_count integer;
BEGIN
  IF v_limit < 0 THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.campaigns
  WHERE user_id = NEW.user_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'plan_limit_exceeded:campaigns:%', v_limit USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_campaign_limit_trigger ON public.campaigns;
CREATE TRIGGER enforce_campaign_limit_trigger
BEFORE INSERT ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.enforce_campaign_limit();

-- 5) Grants så att klienten kan anropa funktionerna via RPC
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_plan_limit(uuid, text) TO authenticated, service_role;
