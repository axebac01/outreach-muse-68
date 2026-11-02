CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS idx_email_messages_account_provider ON public.email_messages (email_account_id, provider_message_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON public.email_messages (user_id, email_account_id, thread_key, created_at);
CREATE INDEX IF NOT EXISTS idx_sequence_leads_user_email_trgm ON public.sequence_leads USING gin (email extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sequence_leads_user_email ON public.sequence_leads (user_id, email);