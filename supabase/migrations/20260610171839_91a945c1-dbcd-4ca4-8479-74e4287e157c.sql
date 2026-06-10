
ALTER TABLE public.email_accounts DROP CONSTRAINT IF EXISTS email_accounts_status_check;
ALTER TABLE public.email_accounts ADD CONSTRAINT email_accounts_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'needs_reauth'::text, 'error'::text, 'disabled'::text, 'paused_bounce'::text]));

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

  SELECT count(*)
    INTO v_sent_count
    FROM public.email_messages
   WHERE email_account_id = v_account_id
     AND direction = 'outbound'
     AND status = 'sent'
     AND sent_at >= now() - INTERVAL '24 hours';

  -- DISTINCT på bounce-id så samma bounce inte räknas flera gånger när
  -- en mottagare fått flera meddelanden från samma konto.
  SELECT count(DISTINCT b.id)
    INTO v_bounce_count
    FROM public.bounces b
   WHERE b.user_id = NEW.user_id
     AND b.hard
     AND b.bounced_at >= now() - INTERVAL '24 hours'
     AND EXISTS (
       SELECT 1 FROM public.email_messages m
        WHERE m.user_id = b.user_id
          AND m.email_account_id = v_account_id
          AND m.direction = 'outbound'
          AND lower(m.to_address) = lower(b.email)
     );

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
