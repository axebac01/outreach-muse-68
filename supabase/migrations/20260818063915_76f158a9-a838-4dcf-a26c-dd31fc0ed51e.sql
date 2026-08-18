ALTER VIEW public.email_accounts_safe SET (security_invoker = false);
GRANT SELECT ON public.email_accounts_safe TO authenticated;