-- 1) Restrict client SELECT on email_accounts to non-sensitive columns only.
REVOKE SELECT ON public.email_accounts FROM authenticated;
GRANT SELECT (
  id, user_id, email, provider, display_name, auth_type,
  token_expires_at,
  smtp_host, smtp_port, smtp_username, smtp_secure,
  imap_host, imap_port, imap_username, imap_secure,
  status, status_message, last_synced_at, history_id, imap_last_uid,
  provider_account_id, oauth_scopes, provider_delta_link,
  signature, sender_name, created_at, updated_at
) ON public.email_accounts TO authenticated;

-- 2) Remove client-side INSERT on audit_log; only service_role writes from edge functions.
DROP POLICY IF EXISTS "Users insert own audit entries" ON public.audit_log;
REVOKE INSERT ON public.audit_log FROM authenticated;