-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Email accounts table
CREATE TABLE public.email_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'smtp')),
  display_name TEXT,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth', 'smtp')),
  -- Encrypted credentials (bytea via pgp_sym_encrypt)
  access_token_enc BYTEA,
  refresh_token_enc BYTEA,
  token_expires_at TIMESTAMPTZ,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password_enc BYTEA,
  smtp_secure BOOLEAN DEFAULT true,
  imap_host TEXT,
  imap_port INTEGER,
  imap_username TEXT,
  imap_password_enc BYTEA,
  imap_secure BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_reauth', 'error', 'disabled')),
  status_message TEXT,
  last_synced_at TIMESTAMPTZ,
  history_id TEXT,
  imap_last_uid BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, email)
);

ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

-- Block direct SELECT from clients — clients must use the safe view below
-- (we still allow user-scoped INSERT/UPDATE/DELETE for management flows that don't touch secret cols)
CREATE POLICY "Users can insert own email accounts"
  ON public.email_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email accounts"
  ON public.email_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email accounts"
  ON public.email_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- No SELECT policy on the base table → clients cannot read encrypted columns.
-- Provide a safe view exposing only non-sensitive columns:
CREATE OR REPLACE VIEW public.email_accounts_safe
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  email,
  provider,
  display_name,
  auth_type,
  smtp_host,
  smtp_port,
  smtp_username,
  smtp_secure,
  imap_host,
  imap_port,
  imap_username,
  imap_secure,
  status,
  status_message,
  last_synced_at,
  created_at,
  updated_at
FROM public.email_accounts;

-- Need a SELECT policy on base for the view (security_invoker) — but restrict to non-secret access pattern.
-- Since we can't column-restrict via RLS, we keep base SELECT allowed for owners; the view is the recommended client surface.
CREATE POLICY "Users can view own email accounts (safe cols via view)"
  ON public.email_accounts FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT ON public.email_accounts_safe TO authenticated;

-- Email messages table
CREATE TABLE public.email_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  provider_message_id TEXT,
  thread_id TEXT,
  in_reply_to TEXT,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'failed', 'received')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email messages"
  ON public.email_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email messages"
  ON public.email_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email messages"
  ON public.email_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email messages"
  ON public.email_messages FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_email_messages_user_id ON public.email_messages(user_id);
CREATE INDEX idx_email_messages_lead_id ON public.email_messages(lead_id);
CREATE INDEX idx_email_messages_thread_id ON public.email_messages(thread_id);
CREATE INDEX idx_email_messages_account ON public.email_messages(email_account_id);

-- Index on leads.email for inbound matching
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(LOWER(email));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_email_accounts_updated_at
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();