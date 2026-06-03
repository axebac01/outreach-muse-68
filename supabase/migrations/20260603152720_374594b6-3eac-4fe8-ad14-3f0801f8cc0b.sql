
-- Switch view back to security_invoker so the linter is happy
DROP VIEW public.email_accounts_safe;

CREATE VIEW public.email_accounts_safe
WITH (security_invoker = true) AS
SELECT
  id, user_id, email, provider, display_name, auth_type,
  smtp_host, smtp_port, smtp_username, smtp_secure,
  imap_host, imap_port, imap_username, imap_secure,
  status, status_message, last_synced_at,
  created_at, updated_at, signature, sender_name
FROM public.email_accounts
WHERE user_id = auth.uid();

GRANT SELECT ON public.email_accounts_safe TO authenticated;

-- Replace the deny-all SELECT policy with an owner-only policy so the
-- security_invoker view can read rows. Encrypted token columns remain
-- ciphertext (pgp_sym_encrypt) and cannot be decrypted client-side.
DROP POLICY IF EXISTS "Deny direct select on email_accounts" ON public.email_accounts;
CREATE POLICY "Users can view own email accounts"
  ON public.email_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
