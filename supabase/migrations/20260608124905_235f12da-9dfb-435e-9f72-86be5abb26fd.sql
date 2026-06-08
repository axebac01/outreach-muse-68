
REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, text, jsonb, text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.spend_credits(uuid, integer, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_wallet_balance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_credit_buckets() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_credit_on_bounce() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, text, jsonb, text, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid, integer, text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.recalc_wallet_balance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_credit_buckets() TO service_role;
