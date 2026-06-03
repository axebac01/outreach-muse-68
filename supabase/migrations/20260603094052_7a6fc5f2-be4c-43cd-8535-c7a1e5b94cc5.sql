-- Lås klient-SELECT på råtabellen
DROP POLICY IF EXISTS "Users can view own email accounts (safe cols via view)" ON public.email_accounts;
REVOKE SELECT ON public.email_accounts FROM authenticated;
REVOKE SELECT ON public.email_accounts FROM anon;

-- Säkerställ åtkomst till den säkra vyn
GRANT SELECT ON public.email_accounts_safe TO authenticated;