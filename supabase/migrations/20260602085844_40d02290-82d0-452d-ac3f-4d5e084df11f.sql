
-- Add is_lead_related flag to filter Unibox
ALTER TABLE public.email_messages ADD COLUMN IF NOT EXISTS is_lead_related boolean NOT NULL DEFAULT false;
ALTER TABLE public.email_threads ADD COLUMN IF NOT EXISTS is_lead_related boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_email_threads_lead_related
  ON public.email_threads (user_id, is_lead_related, last_message_at DESC)
  WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_email_messages_lead_related
  ON public.email_messages (user_id, is_lead_related, received_at DESC);

-- Backfill messages
UPDATE public.email_messages
SET is_lead_related = true
WHERE is_lead_related = false
  AND (lead_id IS NOT NULL OR sequence_id IS NOT NULL OR direction = 'outbound');

-- Backfill threads: any related message in same (email_account_id, thread_key)
UPDATE public.email_threads t
SET is_lead_related = true
WHERE is_lead_related = false
  AND EXISTS (
    SELECT 1 FROM public.email_messages m
    WHERE m.email_account_id = t.email_account_id
      AND m.thread_key = t.thread_key
      AND m.is_lead_related = true
  );

-- Trigger: when a new lead is added, retroactively mark existing threads/messages
CREATE OR REPLACE FUNCTION public.mark_threads_lead_related_on_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(NEW.email);
BEGIN
  -- Update matching messages (lead_id if null, is_lead_related true)
  UPDATE public.email_messages
  SET is_lead_related = true,
      lead_id = COALESCE(lead_id, NEW.id)
  WHERE user_id = NEW.user_id
    AND (lower(from_address) = v_email OR lower(to_address) = v_email);

  -- Update matching threads
  UPDATE public.email_threads
  SET is_lead_related = true,
      lead_id = COALESCE(lead_id, NEW.id)
  WHERE user_id = NEW.user_id
    AND v_email = ANY (ARRAY(SELECT lower(p) FROM unnest(participants) p));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_threads_on_new_lead ON public.sequence_leads;
CREATE TRIGGER trg_mark_threads_on_new_lead
AFTER INSERT ON public.sequence_leads
FOR EACH ROW EXECUTE FUNCTION public.mark_threads_lead_related_on_new_lead();
