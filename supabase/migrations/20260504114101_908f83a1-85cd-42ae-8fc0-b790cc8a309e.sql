-- Drop old install in public if present
DROP EXTENSION IF EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.encrypt_secret(plaintext text, key text)
RETURNS bytea
LANGUAGE sql
IMMUTABLE
SET search_path = extensions, public
AS $$
  SELECT extensions.pgp_sym_encrypt(plaintext, key);
$$;

CREATE OR REPLACE FUNCTION public.decrypt_secret(ciphertext bytea, key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = extensions, public
AS $$
  SELECT extensions.pgp_sym_decrypt(ciphertext, key);
$$;

ALTER TABLE public.email_accounts
  ADD COLUMN IF NOT EXISTS provider_account_id text,
  ADD COLUMN IF NOT EXISTS oauth_scopes text,
  ADD COLUMN IF NOT EXISTS provider_delta_link text;

CREATE UNIQUE INDEX IF NOT EXISTS email_accounts_user_provider_account_uniq
  ON public.email_accounts (user_id, provider, provider_account_id)
  WHERE provider_account_id IS NOT NULL;
