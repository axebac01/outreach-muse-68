
DROP VIEW IF EXISTS public.email_accounts_safe;
CREATE VIEW public.email_accounts_safe
WITH (security_invoker = true)
AS
SELECT
  id, user_id, email, provider, display_name, auth_type,
  smtp_host, smtp_port, smtp_username, smtp_secure,
  imap_host, imap_port, imap_username, imap_secure,
  status, status_message, last_synced_at,
  created_at, updated_at,
  signature, sender_name
FROM public.email_accounts;
