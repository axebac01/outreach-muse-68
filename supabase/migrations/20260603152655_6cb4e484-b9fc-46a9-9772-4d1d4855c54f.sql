
-- Recreate view as SECURITY DEFINER (default) so it bypasses RLS on email_accounts
-- but only exposes safe columns (no encrypted tokens).
DROP VIEW IF EXISTS public.email_accounts_safe;

CREATE VIEW public.email_accounts_safe AS
SELECT
  id, user_id, email, provider, display_name, auth_type,
  smtp_host, smtp_port, smtp_username, smtp_secure,
  imap_host, imap_port, imap_username, imap_secure,
  status, status_message, last_synced_at,
  created_at, updated_at, signature, sender_name
FROM public.email_accounts;

-- Filter inside the view definition is not enough; enforce per-user filtering
-- via a SECURITY INVOKER view that reads through a SECURITY DEFINER function
-- would be overkill. Instead: keep view non-invoker, and rely on a WHERE clause.
-- Simpler: add a row-filter directly in the view using auth.uid().
DROP VIEW public.email_accounts_safe;

CREATE VIEW public.email_accounts_safe AS
SELECT
  id, user_id, email, provider, display_name, auth_type,
  smtp_host, smtp_port, smtp_username, smtp_secure,
  imap_host, imap_port, imap_username, imap_secure,
  status, status_message, last_synced_at,
  created_at, updated_at, signature, sender_name
FROM public.email_accounts
WHERE user_id = auth.uid();

GRANT SELECT ON public.email_accounts_safe TO authenticated;

-- Add restrictive deny policy on base table to ensure clients can never
-- SELECT raw rows (which would include encrypted tokens).
DROP POLICY IF EXISTS "Deny direct select on email_accounts" ON public.email_accounts;
CREATE POLICY "Deny direct select on email_accounts"
  ON public.email_accounts FOR SELECT
  USING (false);
