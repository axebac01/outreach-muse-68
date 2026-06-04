
-- A) Throttle persistence: track last send per account
ALTER TABLE public.email_accounts ADD COLUMN IF NOT EXISTS last_send_at timestamptz;

-- G) Defense-in-depth: revoke encrypted column access from authenticated.
-- email_accounts_safe view (security_invoker default) already excludes these,
-- but a direct select on the table from the client would still expose them
-- since RLS filters rows, not columns. Edge functions use service_role and
-- are unaffected.
REVOKE SELECT (access_token_enc, refresh_token_enc, smtp_password_enc, imap_password_enc)
  ON public.email_accounts FROM authenticated;
REVOKE SELECT (access_token_enc, refresh_token_enc, smtp_password_enc, imap_password_enc)
  ON public.email_accounts FROM anon;

-- H) Timezone validation via trigger (CHECK constraints must be immutable;
-- pg_timezone_names is a view, so use a trigger instead).
CREATE OR REPLACE FUNCTION public.validate_sequence_timezone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.timezone IS NULL OR NEW.timezone = '' THEN
    NEW.timezone := 'UTC';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone) THEN
    RAISE EXCEPTION 'Invalid timezone: %. Use an IANA zone like Europe/Stockholm.', NEW.timezone
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sequences_validate_timezone ON public.sequences;
CREATE TRIGGER sequences_validate_timezone
  BEFORE INSERT OR UPDATE OF timezone ON public.sequences
  FOR EACH ROW EXECUTE FUNCTION public.validate_sequence_timezone();

-- Backfill any invalid existing rows to UTC (safe no-op if all already valid)
UPDATE public.sequences
   SET timezone = 'UTC'
 WHERE timezone IS NULL
    OR timezone = ''
    OR NOT EXISTS (SELECT 1 FROM pg_timezone_names tz WHERE tz.name = sequences.timezone);

-- I) Aggregated count for scheduler — avoids hauling rows just to count
CREATE OR REPLACE FUNCTION public.get_sent_today_by_account(account_ids uuid[])
RETURNS TABLE(email_account_id uuid, sent_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email_account_id, count(*)::bigint
    FROM public.email_messages
   WHERE email_account_id = ANY(account_ids)
     AND direction = 'outbound'
     AND status = 'sent'
     AND sent_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
   GROUP BY email_account_id;
$$;

REVOKE ALL ON FUNCTION public.get_sent_today_by_account(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sent_today_by_account(uuid[]) TO service_role;
