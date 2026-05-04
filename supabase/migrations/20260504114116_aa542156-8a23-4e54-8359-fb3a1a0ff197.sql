REVOKE EXECUTE ON FUNCTION public.encrypt_secret(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_secret(bytea, text) FROM PUBLIC, anon, authenticated;
