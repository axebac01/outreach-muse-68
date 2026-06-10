
-- Add bounce-protection & deliverability check columns to email_accounts
ALTER TABLE public.email_accounts
  ADD COLUMN IF NOT EXISTS paused_reason text,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS deliverability_check jsonb,
  ADD COLUMN IF NOT EXISTS deliverability_checked_at timestamptz;

-- Trigger: efter ny hard bounce, beräkna bounce-rate för avsändarkontot
-- senaste 24h och auto-pausa om över tröskeln.
CREATE OR REPLACE FUNCTION public.auto_pause_on_high_bounce_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_sent_count integer;
  v_bounce_count integer;
  v_rate numeric;
BEGIN
  IF NOT NEW.hard THEN
    RETURN NEW;
  END IF;

  -- Hitta vilket avsändarkonto som senast skickade till denna mottagare
  SELECT email_account_id
    INTO v_account_id
    FROM public.email_messages
   WHERE user_id = NEW.user_id
     AND direction = 'outbound'
     AND lower(to_address) = lower(NEW.email)
     AND sent_at >= now() - INTERVAL '7 days'
     AND email_account_id IS NOT NULL
   ORDER BY sent_at DESC NULLS LAST
   LIMIT 1;

  IF v_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Räkna senaste 24h sändningar för det kontot
  SELECT count(*)
    INTO v_sent_count
    FROM public.email_messages
   WHERE email_account_id = v_account_id
     AND direction = 'outbound'
     AND status = 'sent'
     AND sent_at >= now() - INTERVAL '24 hours';

  -- Räkna hard bounces samma fönster
  SELECT count(*)
    INTO v_bounce_count
    FROM public.bounces b
    JOIN public.email_messages m
      ON m.user_id = b.user_id
     AND lower(m.to_address) = lower(b.email)
     AND m.email_account_id = v_account_id
     AND m.direction = 'outbound'
   WHERE b.hard
     AND b.bounced_at >= now() - INTERVAL '24 hours';

  IF v_sent_count < 20 THEN
    RETURN NEW;
  END IF;

  v_rate := v_bounce_count::numeric / NULLIF(v_sent_count, 0);

  IF v_rate >= 0.08 THEN
    UPDATE public.email_accounts
       SET status = 'paused_bounce',
           status_message = format('Auto-pausad: %s%% bounce-rate senaste 24h (%s av %s)',
                                    round(v_rate * 100), v_bounce_count, v_sent_count),
           paused_reason = 'high_bounce_rate',
           paused_at = now(),
           updated_at = now()
     WHERE id = v_account_id
       AND status <> 'paused_bounce';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bounces_auto_pause ON public.bounces;
CREATE TRIGGER bounces_auto_pause
AFTER INSERT ON public.bounces
FOR EACH ROW
EXECUTE FUNCTION public.auto_pause_on_high_bounce_rate();
