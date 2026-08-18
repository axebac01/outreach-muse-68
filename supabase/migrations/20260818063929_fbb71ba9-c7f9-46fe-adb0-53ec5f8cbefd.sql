ALTER VIEW public.email_accounts_safe SET (security_invoker = true);

REVOKE SELECT ON public.email_accounts FROM authenticated;
GRANT SELECT (
  id, user_id, email, provider, display_name, auth_type,
  smtp_host, smtp_port, smtp_username, smtp_secure,
  imap_host, imap_port, imap_username, imap_secure,
  status, status_message, last_synced_at, created_at, updated_at,
  signature, sender_name, paused_reason, paused_at,
  deliverability_check, deliverability_checked_at
) ON public.email_accounts TO authenticated;

DROP POLICY IF EXISTS "Users can view own email accounts" ON public.email_accounts;
CREATE POLICY "Users can view own email accounts"
ON public.email_accounts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);