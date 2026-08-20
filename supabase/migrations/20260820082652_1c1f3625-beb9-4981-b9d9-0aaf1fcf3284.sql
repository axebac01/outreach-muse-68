
CREATE OR REPLACE FUNCTION public.cancel_sends_on_lead_invalidated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('invalid', 'unsubscribed', 'bounced')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.scheduled_sends
       SET status = 'cancelled',
           cancelled_reason = 'lead_' || NEW.status,
           updated_at = now()
     WHERE lead_id = NEW.id
       AND status IN ('scheduled', 'processing');
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_cancel_sends_on_lead_invalidated ON public.sequence_leads;
CREATE TRIGGER trg_cancel_sends_on_lead_invalidated
AFTER UPDATE OF status ON public.sequence_leads
FOR EACH ROW EXECUTE FUNCTION public.cancel_sends_on_lead_invalidated();

CREATE OR REPLACE FUNCTION public.auto_pause_sequence_on_high_bounce_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
BEGIN
  IF NOT NEW.hard THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT s.id,
           (SELECT count(*) FROM public.scheduled_sends ss
             WHERE ss.sequence_id = s.id
               AND ss.status = 'sent'
               AND ss.updated_at >= now() - INTERVAL '7 days') AS sent_count,
           (SELECT count(DISTINCT b.id) FROM public.bounces b
             WHERE b.user_id = s.user_id
               AND b.hard
               AND b.bounced_at >= now() - INTERVAL '7 days'
               AND EXISTS (
                 SELECT 1 FROM public.sequence_leads sl
                  WHERE sl.sequence_id = s.id
                    AND lower(sl.email) = lower(b.email)
               )) AS bounce_count
      FROM public.sequences s
     WHERE s.user_id = NEW.user_id
       AND s.status = 'active'
       AND EXISTS (
         SELECT 1 FROM public.sequence_leads sl
          WHERE sl.sequence_id = s.id
            AND lower(sl.email) = lower(NEW.email)
       )
  LOOP
    IF r.sent_count >= 20
       AND r.bounce_count::numeric / NULLIF(r.sent_count, 0) >= 0.08 THEN
      UPDATE public.sequences
         SET status = 'paused',
             paused_reason = format('Auto-pausad: %s%% studsar senaste 7 dagarna (%s av %s utskick). Rensa ogiltiga adresser innan du startar igen.',
                                    round(r.bounce_count::numeric / r.sent_count * 100), r.bounce_count, r.sent_count),
             paused_at = now(),
             updated_at = now()
       WHERE id = r.id
         AND status = 'active';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;
