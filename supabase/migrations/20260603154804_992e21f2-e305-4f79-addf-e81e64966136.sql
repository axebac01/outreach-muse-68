GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_accounts TO authenticated;
GRANT ALL ON public.email_accounts TO service_role;
GRANT SELECT ON public.email_accounts_safe TO authenticated;