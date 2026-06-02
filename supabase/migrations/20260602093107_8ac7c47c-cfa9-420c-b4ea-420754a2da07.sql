REVOKE EXECUTE ON FUNCTION public.spend_credits(uuid, integer, text, uuid, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_credit_wallet_for_new_user() FROM anon, authenticated, PUBLIC;