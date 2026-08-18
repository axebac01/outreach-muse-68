ALTER TABLE public.sequences
  ADD COLUMN IF NOT EXISTS paused_reason text,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;

CREATE OR REPLACE FUNCTION public.auto_pause_sequence_on_high_bounce_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF NOT NEW.hard THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT s.id,
           (SELECT count(*) FROM public.scheduled_sends ss
             WHERE ss.sequence_id = s.id AND ss.status = 'sent') AS sent_count,
           (SELECT count(*) FROM public.sequence_leads sl
             WHERE sl.sequence_id = s.id AND sl.status = 'bounced') AS bounce_count
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
             paused_reason = format('Auto-pausad: %s%% studsar (%s av %s utskick). Rensa ogiltiga adresser innan du startar igen.',
                                    round(r.bounce_count::numeric / r.sent_count * 100), r.bounce_count, r.sent_count),
             paused_at = now(),
             updated_at = now()
       WHERE id = r.id
         AND status = 'active';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_pause_sequence_on_bounce ON public.bounces;
CREATE TRIGGER trg_auto_pause_sequence_on_bounce
AFTER INSERT ON public.bounces
FOR EACH ROW EXECUTE FUNCTION public.auto_pause_sequence_on_high_bounce_rate();