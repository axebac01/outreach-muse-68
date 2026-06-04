
REVOKE EXECUTE ON FUNCTION public.get_sent_today_by_account(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_sent_today_by_account(uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_sent_today_by_account(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_sent_today_by_account(uuid[]) TO service_role;
